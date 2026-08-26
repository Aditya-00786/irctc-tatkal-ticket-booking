import re
with open("app.bundle.js", "r") as f:
    content = f.read()

# find Autocomplete in exports or definitions
idx = 0
while True:
    idx = content.find("Autocomplete", idx)
    if idx == -1: break
    print("---")
    print(content[max(0, idx-100):min(len(content), idx+100)])
    idx += 1
