import urllib.request

url = "https://mits-news.onrender.com/api/posts/7/"
print("Fetching raw JSON from:", url)

try:
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
    print("Raw Response:")
    print(content)
except Exception as e:
    print("Error:", e)
