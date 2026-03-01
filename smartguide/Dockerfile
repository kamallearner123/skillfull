# SmartGuide — CUDA-enabled Docker image
# Uses nvidia/cuda as the base so vLLM can access the GPU via NVIDIA Container Toolkit.
#
# Build:  docker compose build
# Run:    docker compose up
#
# Requirements on the host:
#   - NVIDIA drivers ≥ 525
#   - nvidia-container-toolkit installed (https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)

FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

# ── System deps ───────────────────────────────────────────────────────────────
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-dev \
    python3-pip \
    git \
    curl \
    build-essential \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

# Fix for Triton/nvcc finding libcuda
# We symlink the stub so Triton can compile its kernels even if the real driver isn't visible yet.
RUN find /usr/local/cuda -name libcuda.so -path "*/stubs/*" | head -n 1 | xargs -I {} ln -sf {} /usr/lib/x86_64-linux-gnu/libcuda.so \
    && find /usr/local/cuda -name libcuda.so -path "*/stubs/*" | head -n 1 | xargs -I {} ln -sf {} /usr/lib/x86_64-linux-gnu/libcuda.so.1 \
    && ldconfig

RUN ln -sf /usr/bin/python3 /usr/bin/python && \
    ln -sf /usr/bin/pip3 /usr/bin/pip

# ── Python deps ───────────────────────────────────────────────────────────────
WORKDIR /app

COPY requirements.txt .

# Install PyTorch with CUDA 12.1 first (vLLM depends on it)
RUN pip install --no-cache-dir \
    torch==2.3.0+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

RUN pip install --no-cache-dir -r requirements.txt

# ── App source ────────────────────────────────────────────────────────────────
COPY app/ ./app/

# ── Model volume (weights are NOT baked into the image) ───────────────────────
# Mount your model weights at /app/models at runtime, or set MODEL_NAME to a
# HuggingFace repo-id and the container will download on first start.
VOLUME ["/app/models"]

# ── Runtime ───────────────────────────────────────────────────────────────────
EXPOSE 8080

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV LIBRARY_PATH=/usr/local/cuda/lib64/stubs:${LIBRARY_PATH}
ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64/stubs:${LD_LIBRARY_PATH}
ENV VLLM_USE_V1=0
ENV VLLM_ATTENTION_BACKEND=XFORMERS
ENV VLLM_DISABLE_FLASH_ATTN=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
