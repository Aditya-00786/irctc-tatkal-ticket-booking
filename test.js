// try to parse the file to see if it's valid JS
try {
  require("./app.bundle.js");
  print("Valid JS syntax");
} catch(e) {
  console.log("Syntax error or runtime error:", e.message);
}
