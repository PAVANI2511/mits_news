import urllib.request
import json

url = "https://mits-news.onrender.com/api/auth/debug-cloudinary/"
print("Pinging diagnostic URL:", url)

try:
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
    print("Response Status: 200")
    print("Data:", json.loads(content))
except Exception as e:
    print("Failed:", e)
    if hasattr(e, 'read'):
        print("Response:", e.read().decode('utf-8'))
