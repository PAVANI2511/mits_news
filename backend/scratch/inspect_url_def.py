import urllib.request
import re

url = "https://mits-news-frontend.onrender.com/assets/index-DcZqrryg.js"
print("Downloading JS from", url)

try:
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
        
    # Find matching statements in the JS bundle
    # Let's search for "mits-news" or "127.0.0.1" context
    for line in content.split(";"):
        if "mits-news" in line or "127.0.0.1" in line:
            # Print a snippet of 200 chars around it
            idx = line.find("mits-news") if "mits-news" in line else line.find("127.0.0.1")
            start = max(0, idx - 100)
            end = min(len(line), idx + 100)
            print("Match snippet:", line[start:end])
except Exception as e:
    print("Error:", e)
