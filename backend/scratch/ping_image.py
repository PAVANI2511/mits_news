import urllib.request

url = "https://mits-news.onrender.com/posts/images/WhatsApp_Image_2026-07-07_at_10.54.31_AM.jpeg"
print("Pinging image URL:", url)

try:
    with urllib.request.urlopen(url) as response:
        status_code = response.getcode()
        print("Success! Status:", status_code)
except Exception as e:
    print("Failed:", e)
