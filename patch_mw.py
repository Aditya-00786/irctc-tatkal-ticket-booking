import re

with open('app.bundle.js', 'r') as f:
    content = f.read()

start_idx = content.find('Mw=function(){')
if start_idx == -1:
    print('Mw=function(){ not found in app.bundle.js')
    exit(1)

open_braces = 0
found_first_brace = False
end_idx = start_idx
while end_idx < len(content):
    if content[end_idx] == '{':
        open_braces += 1
        found_first_brace = True
    elif content[end_idx] == '}':
        open_braces -= 1
    end_idx += 1
    if found_first_brace and open_braces == 0:
        break

print(f"Original Mw component from {start_idx} to {end_idx} (length {end_idx - start_idx})")

with open('mw_new.min.js', 'r') as f:
    mw_min = f.read().strip()

# remove any trailing semicolons or wrapper that esbuild added
if mw_min.endswith(';'): mw_min = mw_min[:-1]

# Check if it starts with Mw=function()
if mw_min.startswith('Mw=function(){'):
    pass
elif mw_min.startswith('(()=>{\n  "use strict";\n  Mw = function() {'): # rough esbuild wrapper
    print("Has esbuild wrapper")
else:
    print("Checking for Mw= in mw_min...")

# find Mw=function() in mw_min
new_start_idx = mw_min.find('Mw=function(){')
if new_start_idx == -1:
    # try looking for whitespace differences
    import re
    match = re.search(r'Mw\s*=\s*function\s*\(\)\s*\{', mw_min)
    if match:
        new_start_idx = match.start()
    else:
        print("Mw=function() not found in mw_new.min.js")
        exit(1)

new_open_braces = 0
new_found_first_brace = False
new_end_idx = new_start_idx
while new_end_idx < len(mw_min):
    if mw_min[new_end_idx] == '{':
        new_open_braces += 1
        new_found_first_brace = True
    elif mw_min[new_end_idx] == '}':
        new_open_braces -= 1
    new_end_idx += 1
    if new_found_first_brace and new_open_braces == 0:
        break

new_block = mw_min[new_start_idx:new_end_idx]
# Ensure new_block is compact like original
new_block = new_block.replace("Mw = function() {", "Mw=function(){")

print(f"New block extracted, length {len(new_block)}")

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('app.bundle.js', 'w') as f:
    f.write(new_content)

print("Patch applied to app.bundle.js!")
