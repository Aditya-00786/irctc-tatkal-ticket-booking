with open("/Users/adisid07/Downloads/irctc-tatkal-ticket-booking-v6.2.0.zip", "rb") as f:
    import zipfile
    z = zipfile.ZipFile(f)
    content = z.read("irctc-tatkal-ticket-booking-v6.2.0/app.bundle.js").decode("utf-8")

start_idx = content.find("Mw=function(){")
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

orig_mw = content[start_idx:end_idx]
print(orig_mw[:500])
print("...")
print(orig_mw[-500:])

with open("orig_mw.js", "w") as outf:
    outf.write(orig_mw)
