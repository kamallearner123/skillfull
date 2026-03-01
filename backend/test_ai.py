
import requests
import json

url = "http://localhost:8080/chat"
payload = {
    "session_id": "test_script",
    "message": "hi",
    "stream": True
}

resp = requests.post(url, json=payload, stream=True)
print(f"Status: {resp.status_code}")

full_reply = ""
for line in resp.iter_lines():
    if not line: continue
    line = line.decode("utf-8")
    if line.startswith("data: "):
        data_obj = json.loads(line[6:])
        if "token" in data_obj:
            full_reply += data_obj["token"]
        if data_obj.get("done"):
            print("\nDone event received.")
            break
        print(data_obj["token"], end="", flush=True)

print(f"\n\nFull Reply: {full_reply}")
