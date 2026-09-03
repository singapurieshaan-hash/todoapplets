const signupBtn =
    document.querySelector("#signup-btn");

const loginBtn =
    document.querySelector("#login-btn");

const message =
    document.querySelector("#message");


signupBtn.addEventListener("click", () => {

    const name =
        document.querySelector("#signup-name").value;

    const email =
        document.querySelector("#signup-email").value;

    const password =
        document.querySelector("#signup-password").value;

    fetch("/signup", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            name,
            email,
            password
        })

    })

    .then(response => response.json())

    .then(data => {
        message.textContent = data.message;
    });

});


loginBtn.addEventListener("click", () => {

    const email =
        document.querySelector("#login-email").value;

    const password =
        document.querySelector("#login-password").value;

    fetch("/login", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email,
            password
        })

    })

    .then(response => response.json())

    .then(data => {

        if (data.token) {

            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "name",
                data.name
            );

            window.location.href = "/index.html";

        } else {

            message.textContent = data.message;

        }

    });

});