import re

with open("app.bundle.js", "r") as f:
    content = f.read()

# Let's search for "Train Details"
idx = content.find("Train Details")
if idx == -1:
    print("Could not find 'Train Details'")
    exit(1)

# Now go backwards to find the function start
start_idx = content.rfind("function(){", 0, idx)
start_idx = content.rfind("=", 0, start_idx) - 2 # e.g. xI=function(){
print("Component signature:", content[start_idx:start_idx+20])

# Let's look at the useState block inside this function
snippet = content[start_idx:idx]
# Find where it does .useState(e.from
match = re.search(r'\[([a-zA-Z0-9_$]+),([a-zA-Z0-9_$]+)\]=\(0,([a-zA-Z0-9_$]+)\.useState\)\(([a-zA-Z0-9_$]+)\.from\|\|""\)', snippet)
if match:
    print("Found useState block!")
    print(match.group(0))
else:
    print("Could not find useState block with regex. Printing snippet...")
    print(snippet[:500])
