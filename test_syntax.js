try {
  require("./app.bundle.js");
  console.log("Valid JS");
} catch(e) {
  console.log("Error:", e.message);
}
