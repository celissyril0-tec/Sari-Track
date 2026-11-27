document.querySelectorAll(".toggle-password").forEach(function (button) {
  button.addEventListener("click", function () {
    const input = document.getElementById(button.dataset.target);
    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";
    button.classList.toggle("showing", isHidden);
  });
});