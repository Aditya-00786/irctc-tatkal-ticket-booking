import re

with open("app.bundle.formatted.js", "r") as f:
    content = f.read()

with open("mw_new.min.js", "r") as f:
    mw_min = f.read().strip()
    
if mw_min.endswith(';'):
    mw_min = mw_min[:-1]

start_idx = content.find("        Mw=function(){")
if start_idx == -1:
    print("Could not find Mw=function(){")
    exit(1)

end_idx = start_idx
open_braces = 0
found_first_brace = False

while end_idx < len(content):
    if content[end_idx] == '{':
        open_braces += 1
        found_first_brace = True
    elif content[end_idx] == '}':
        open_braces -= 1
        
    end_idx += 1
    
    if found_first_brace and open_braces == 0:
        break

original_block = content[start_idx:end_idx]

new_block = "        " + mw_min

new_content = content[:start_idx] + new_block + content[end_idx:]

with open("app.bundle.formatted.js", "w") as f:
    f.write(new_content)

print("Replaced Mw block.")
