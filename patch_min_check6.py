with open("app.bundle.js", "r") as f:
    content = f.read()

print("ER defined?", "ER=" in content)
