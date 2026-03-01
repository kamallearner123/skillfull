"""
SmartGuide — LLM Service
Wraps vLLM, llama.cpp, or a mock backend behind a single async interface.
The backend is selected at startup via settings.LLM_BACKEND.
"""
import asyncio
import logging
import os
from typing import AsyncIterator, List

# Force disable experimental V1 engine and use stable XFORMERS backend
# This must be done BEFORE importing from vllm
os.environ["VLLM_USE_V1"] = "0"
os.environ["VLLM_ATTENTION_BACKEND"] = "XFORMERS"

from app.config import settings

logger = logging.getLogger(__name__)


# ─── Internal helpers ──────────────────────────────────────────────────────────

def _build_messages(system_prompt: str, history: List[dict], user_message: str) -> List[dict]:
    """Assemble the OpenAI-style messages list for the LLM."""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


# ─── vLLM backend ─────────────────────────────────────────────────────────────

class VLLMBackend:
    """
    Wraps the vLLM AsyncLLMEngine.
    vLLM exposes an OpenAI-compatible server; we call it directly via the
    Python API to avoid network overhead within the same process.
    """

    def __init__(self):
        logger.info("Initialising vLLM engine with model: %s", settings.MODEL_NAME)
        from vllm import AsyncLLMEngine, AsyncEngineArgs
        from vllm.sampling_params import SamplingParams  # noqa: F401 — imported for type hints

        engine_args = AsyncEngineArgs(
            model=settings.MODEL_NAME,
            gpu_memory_utilization=settings.GPU_MEMORY_UTILIZATION,
            max_model_len=settings.MAX_MODEL_LEN,
            tensor_parallel_size=settings.TENSOR_PARALLEL_SIZE,
            trust_remote_code=True,
            enforce_eager=True, # Critical for 4GB GPUs
            max_num_seqs=16,    # Reduce from default 128 to save memory
            max_num_batched_tokens=2048,
        )
        self._engine = AsyncLLMEngine.from_engine_args(engine_args)
        logger.info("vLLM engine ready.")

    async def generate(
        self,
        system_prompt: str,
        history: List[dict],
        user_message: str,
    ) -> str:
        """Non-streaming full generation. Returns complete text."""
        tokens = []
        async for token in self.stream(system_prompt, history, user_message):
            tokens.append(token)
        return "".join(tokens)

    async def stream(
        self,
        system_prompt: str,
        history: List[dict],
        user_message: str,
    ) -> AsyncIterator[str]:
        """Streaming token-by-token generation."""
        from vllm import SamplingParams
        from vllm.utils import random_uuid
        from transformers import AutoTokenizer

        # Apply chat template to get a single prompt string
        tokenizer = AutoTokenizer.from_pretrained(settings.MODEL_NAME, trust_remote_code=True)
        messages = _build_messages(system_prompt, history, user_message)
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)

        sampling_params = SamplingParams(
            temperature=settings.TEMPERATURE,
            top_p=settings.TOP_P,
            max_tokens=settings.MAX_NEW_TOKENS,
        )
        request_id = random_uuid()

        results_generator = self._engine.generate(prompt, sampling_params, request_id)
        previous_text = ""
        async for request_output in results_generator:
            new_text = request_output.outputs[0].text
            delta = new_text[len(previous_text):]
            previous_text = new_text
            if delta:
                yield delta


# ─── llama.cpp backend ────────────────────────────────────────────────────────

class LlamaCppBackend:
    """
    Wraps llama-cpp-python for quantised GGUF inference.
    Lower VRAM requirement (~6–8 GB for Q4_K_M of Mistral-7B).
    """

    def __init__(self):
        logger.info("Loading GGUF model from: %s", settings.GGUF_MODEL_PATH)
        from llama_cpp import Llama

        self._llm = Llama(
            model_path=settings.GGUF_MODEL_PATH,
            n_gpu_layers=-1,   # offload all layers to GPU
            n_ctx=settings.MAX_MODEL_LEN,
            verbose=False,
        )
        logger.info("llama.cpp model loaded.")

    async def generate(self, system_prompt: str, history: List[dict], user_message: str) -> str:
        messages = _build_messages(system_prompt, history, user_message)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._llm.create_chat_completion(
                messages=messages,
                max_tokens=settings.MAX_NEW_TOKENS,
                temperature=settings.TEMPERATURE,
                top_p=settings.TOP_P,
            ),
        )
        return result["choices"][0]["message"]["content"]

    async def stream(
        self, system_prompt: str, history: List[dict], user_message: str
    ) -> AsyncIterator[str]:
        messages = _build_messages(system_prompt, history, user_message)
        loop = asyncio.get_event_loop()

        # llama_cpp streaming is synchronous; run in thread pool and yield tokens
        queue: asyncio.Queue = asyncio.Queue()

        def _run():
            for chunk in self._llm.create_chat_completion(
                messages=messages,
                max_tokens=settings.MAX_NEW_TOKENS,
                temperature=settings.TEMPERATURE,
                top_p=settings.TOP_P,
                stream=True,
            ):
                delta = chunk["choices"][0]["delta"].get("content", "")
                if delta:
                    asyncio.run_coroutine_threadsafe(queue.put(delta), loop)
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)  # sentinel

        loop.run_in_executor(None, _run)

        while True:
            token = await queue.get()
            if token is None:
                break
            yield token


# ─── Mock backend (testing / CI without GPU) ─────────────────────────────────

class MockLLMBackend:
    """
    Deterministic stub. Returns templated JSON responses so the API layer can be
    tested without a real model.
    """

    async def generate(self, system_prompt: str, history: List[dict], user_message: str) -> str:
        await asyncio.sleep(0.1)

        if "overall_summary" in system_prompt:
            import json, re

            # Extract score/percentage from prompt
            score_match = re.search(r"Score:\s*(\d+)/(\d+)\s*\((\d+\.?\d*)%\)", user_message)
            score_str = score_match.group(0) if score_match else "your recent assessment"
            pct = float(score_match.group(3)) if score_match else 50.0

            # Extract domain
            domain_match = re.search(r"Domain:\s*(.+)", user_message)
            domain = domain_match.group(1).strip() if domain_match else "this domain"

            # Extract wrong question lines from the prompt
            wrong_q_matches = re.findall(r"\d+\.\s+Q:\s+(.+?)(?=\n\s*\d+\.\s+Q:|\n## |\Z)", user_message, re.DOTALL)
            wrong_topics = []
            for q in wrong_q_matches[:5]:
                q_clean = q.strip().split("\n")[0][:80]
                wrong_topics.append(q_clean)

            # Extract weak topics
            weak_match = re.search(r"Weak Topics:\s*(.+)", user_message)
            weak_list = [t.strip() for t in weak_match.group(1).split(",") if t.strip() != "None identified"] if weak_match else []

            # Build specific feedback
            if pct >= 80:
                perf_summary = (
                    f"Excellent work on your {domain} assessment ({score_str})! "
                    "You have demonstrated strong command of core concepts. "
                    "A few targeted areas can still be improved."
                )
                strengths = ["Strong grasp of fundamental principles", "Accurate on majority of topic areas"]
            elif pct >= 60:
                perf_summary = (
                    f"Good effort on your {domain} assessment ({score_str}). "
                    "You have solid foundational knowledge but several specific areas need attention. "
                    "Targeted revision of the concepts you missed will significantly improve your score."
                )
                strengths = ["Foundational knowledge is in place", "Consistent on easy and moderate difficulty questions"]
            else:
                perf_summary = (
                    f"Your {domain} assessment reveals gaps in key concepts ({score_str}). "
                    "This is a great learning opportunity — focus on the specific questions you got wrong below "
                    "and build upward from the fundamentals."
                )
                strengths = ["Attempted all questions", "Some correct answers show partial understanding"]

            # Specific improvement areas from wrong questions
            improvement_areas = []
            if wrong_topics:
                for qt in wrong_topics[:3]:
                    improvement_areas.append(f"Revise concept: \"{qt[:60]}\"")
            if weak_list:
                improvement_areas.extend([f"Study {s} in depth" for s in weak_list[:2]])
            if not improvement_areas:
                improvement_areas = ["Review incorrect answers in the detailed report", "Practice similar MCQs"]

            # Priority topics from weak subjects + wrong Qs
            priority_topics = []
            if weak_list:
                priority_topics = [f"{s} — Re-study core concepts and practice MCQs" for s in weak_list[:3]]
            if wrong_topics and len(priority_topics) < 3:
                priority_topics.append("Revisit the specific questions you got wrong (see report)")
            if not priority_topics:
                priority_topics = [
                    "Review the detailed question report to identify patterns",
                    "Practice timed MCQs on this domain",
                    "Revise official documentation for weak areas",
                ]

            resources = [
                {"title": f"{domain} — GeeksforGeeks Study Guide", "url": "https://www.geeksforgeeks.org/", "type": "article"},
                {"title": "YouTube Tech Interview Preparation", "url": "https://www.youtube.com/results?search_query=" + domain.replace(" ", "+"), "type": "video"},
                {"title": "LeetCode Practice Problems", "url": "https://leetcode.com/", "type": "course"},
            ]

            note = (
                f"You scored {pct:.0f}% — every wrong answer is a stepping stone. "
                "Review each mistake, understand WHY the correct answer is right, and you will ace it next time!"
            )

            # Build prep_plan with hours per weak topic
            HOURS_BY_DIFFICULTY = {"difficult": 6, "moderate": 4, "easy": 2}
            prep_plan = []

            if weak_list:
                for subj in weak_list[:5]:
                    # Estimate hours: count wrong Qs for this subject from prompt
                    subj_wrongs = [q for q in wrong_topics if subj.lower().replace("_", " ") in q.lower()]
                    n_wrong = len(subj_wrongs)
                    hours = min(2 + n_wrong * 2, 12)
                    priority = "high" if n_wrong >= 3 else ("medium" if n_wrong >= 1 else "low")
                    prep_plan.append({
                        "topic": subj.replace("_", " "),
                        "hours_needed": hours,
                        "priority": priority,
                        "what_to_study": (
                            f"1. Re-read core concepts of {subj.replace('_', ' ')} (2h). "
                            f"2. Solve 15–20 MCQs from GeeksforGeeks on {subj.replace('_', ' ')} (1h). "
                            f"3. Review the specific wrong answers from your report and look up why each correct answer is right (1h)."
                        ),
                        "resources": [
                            f"https://www.geeksforgeeks.org/{subj.lower().replace('_', '-')}/",
                            "https://leetcode.com/",
                        ],
                    })
            elif wrong_topics:
                # Fall back: generic prep for each wrong question concept
                for qt in wrong_topics[:3]:
                    prep_plan.append({
                        "topic": qt[:50],
                        "hours_needed": 3,
                        "priority": "high",
                        "what_to_study": f"Revise the concept behind: \"{qt[:60]}\". Read 2 articles, then do 10 practice MCQs.",
                        "resources": ["https://www.geeksforgeeks.org/", "https://www.youtube.com/"],
                    })
            if not prep_plan:
                prep_plan = [{
                    "topic": f"{domain} — General Review",
                    "hours_needed": 4,
                    "priority": "medium",
                    "what_to_study": f"Review foundational concepts of {domain}, practise 20 MCQs, watch a 45-min intro video.",
                    "resources": [f"https://www.geeksforgeeks.org/", "https://www.youtube.com/"],
                }]

            return json.dumps({
                "overall_summary": perf_summary,
                "strengths": strengths,
                "improvement_areas": improvement_areas,
                "priority_topics": priority_topics,
                "suggested_resources": resources,
                "motivational_note": note,
                "prep_plan": prep_plan,
            })


        if "day_label" in system_prompt:
            import json
            return json.dumps({"overall_strategy": "Focus on weak areas first, then consolidate strong areas.", "plan": []})

        return "[MOCK] Placeholder — deploy with a real LLM backend for actual inference."


    async def stream(
        self, system_prompt: str, history: List[dict], user_message: str
    ) -> AsyncIterator[str]:
        words = ["[MOCK", " LLM]\", \" Streaming", " placeholder", " response."]
        for word in words:
            await asyncio.sleep(0.05)
            yield word


# ─── Factory ──────────────────────────────────────────────────────────────────

_backend_instance = None


def get_llm_backend():
    """Return the singleton LLM backend. Initialised on first call."""
    global _backend_instance
    if _backend_instance is None:
        backend = settings.LLM_BACKEND
        logger.info("Loading LLM backend: %s", backend)
        if backend == "vllm":
            _backend_instance = VLLMBackend()
        elif backend == "llama_cpp":
            _backend_instance = LlamaCppBackend()
        else:
            _backend_instance = MockLLMBackend()
    return _backend_instance
