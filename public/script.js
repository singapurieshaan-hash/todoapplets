document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("#todo-form");
    const taskInput = document.querySelector("#task-input");
    const todoList = document.querySelector("#todo-list");
    const logoutButton = document.querySelector("#logout-btn");

    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    // LOGOUT
    logoutButton.addEventListener("click", () => {

      localStorage.removeItem("token");
      localStorage.removeItem("name");

      window.location.href = "/login.html";

    });


    // LOAD TODOS
    function loadTodos() {

        fetch("/todos", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })

        .then(response => {

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("name");
                window.location.href = "/login.html";
                return;
            }

            return response.json();
        })

        .then(todos => {

            if (!todos) return;

            todoList.innerHTML = "";

            todos.forEach(todo => {

                const li = document.createElement("li");

                const text = document.createElement("span");
                text.textContent = todo.task;

                if (todo.done === 1) {
                    text.classList.add("done");
                }


                const doneButton = document.createElement("button");
                doneButton.textContent = "Done";

                doneButton.addEventListener("click", () => {

                    fetch(`/todos/${todo.id}`, {
                        method: "PATCH",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    })

                    .then(response => {

                        if (!response.ok) {
                            throw new Error(`HTTP error: ${response.status}`);
                        }

                        return response.json();
                    })

                    .then(() => {
                        loadTodos();
                    })

                    .catch(error => {
                        console.error("Error updating todo:", error);
                    });

                });


                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Delete";

                deleteButton.addEventListener("click", () => {

                    fetch(`/todos/${todo.id}`, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    })

                    .then(response => {

                        if (!response.ok) {
                            throw new Error(`HTTP error: ${response.status}`);
                        }

                        return response.json();
                    })

                    .then(() => {
                        loadTodos();
                    })

                    .catch(error => {
                        console.error("Error deleting todo:", error);
                    });

                });


                li.appendChild(text);
                li.appendChild(doneButton);
                li.appendChild(deleteButton);

                todoList.appendChild(li);

            });

        })

        .catch(error => {
            console.error("Error loading todos:", error);
        });

    }


    // ADD TODO
    form.addEventListener("submit", (event) => {

        event.preventDefault();

        const task = taskInput.value.trim();

        if (!task) {
            return;
        }

        fetch("/todos", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },

            body: JSON.stringify({
                task: task
            })
        })

        .then(response => {

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            return response.json();
        })

        .then(() => {

            taskInput.value = "";

            loadTodos();

        })

        .catch(error => {
            console.error("Error adding todo:", error);
        });

    });


    loadTodos();

});
