import urllib.request
import json

url = "https://mits-news.onrender.com/api/posts/7/"
print("Fetching post 7 from:", url)

try:
    with urllib.request.urlopen(url) as response:
        status_code = response.getcode()
        content = response.read().decode('utf-8')
    print("Status code:", status_code)
    data = json.loads(content)
    print("Post 7 data:")
    for k in ['id', 'caption', 'image', 'video', 'poster', 'pdf']:
        print(f"  {k}: {data.get(k)}")
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Response:", e.read().decode('utf-8'))
