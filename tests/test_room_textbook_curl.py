import urllib.request
import json

data = json.dumps({
    "subject": "Физика",
    "grade": 7,
    "topic": "Строение вещества",
    "textbook_id": "peryshkin_phys_7",
    "paragraph_num": 3
}).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8000/rooms",
    data=data,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode("utf-8"))
        print("ROOM CREATED:", res["room_id"], res["token"])
        print("TITLE:", res.get("quiz_title"))
        print("QUESTIONS COUNT:", len(res.get("questions", [])))
        for idx, q in enumerate(res.get("questions", [])):
            print(f"  Q{idx+1}: {q['text'][:50]}... ({len(q['options'])} opts)")
except Exception as e:
    print("ERROR:", e)
