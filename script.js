/* ==========================================
   DETAILING LANDING INTERACTION LOGIC (script.js)
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Before/After Slider Logic
    const container = document.getElementById("sliderContainer");
    const afterImage = document.getElementById("afterImage");
    const handle = document.getElementById("sliderHandle");
    let isDragging = false;

    // Helper function to update slider position
    function updateSlider(clientX) {
        const rect = container.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        let percentage = (offsetX / rect.width) * 100;

        // Constrain percentage between 0 and 100
        if (percentage < 0) percentage = 0;
        if (percentage > 100) percentage = 100;

        // Update DOM elements
        afterImage.style.width = `${percentage}%`;
        handle.style.left = `${percentage}%`;
    }

    // Mouse Events
    handle.addEventListener("mousedown", () => {
        isDragging = true;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        updateSlider(e.clientX);
    });

    // Touch Events (Mobile)
    handle.addEventListener("touchstart", () => {
        isDragging = true;
    });

    window.addEventListener("touchend", () => {
        isDragging = false;
    });

    window.addEventListener("touchmove", (e) => {
        if (!isDragging) return;
        if (e.touches.length > 0) {
            updateSlider(e.touches[0].clientX);
        }
    });

    // Optional: Click anywhere on container to move slider
    container.addEventListener("click", (e) => {
        if (e.target.closest("#sliderHandle")) return; // Prevent double trigger
        updateSlider(e.clientX);
    });


    // 2. Form Submission Logic
    const form = document.getElementById("detailingForm");
    const submitBtn = form.querySelector(".submit-btn");
    const visitDateInput = form.date;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    visitDateInput.min = today.toISOString().slice(0, 10);

    function isValidText(value, maxLength) {
        return value.length > 0 && value.length <= maxLength;
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const contact = form.contact.value.trim();
        const carModel = form.car_model.value.trim();
        const serviceSelect = document.getElementById("serviceType");
        const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
        const date = form.date.value;
        const time = form.time.value;

        if (!isValidText(name, 60) || !isValidText(contact, 80) || !isValidText(carModel, 80)) {
            alert("Проверьте имя, контакт и модель автомобиля: поля не должны быть пустыми или слишком длинными.");
            return;
        }

        if (!date || date < visitDateInput.min) {
            alert("Выберите актуальную дату визита.");
            return;
        }

        const message = 
            `Запись на детейлинг:\n` +
            `- Услуга: ${serviceText}\n` +
            `- Автомобиль: ${carModel}\n` +
            `- Дата визита: ${date} в ${time}`;

        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправка записи...";

        fetch("/api/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                contact: contact,
                message: message,
                source: "detailing"
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Server error");
            return res.json();
        })
        .then(data => {
            alert(`Спасибо, ${name}! Заявка на детейлинг отправлена. Мастер свяжется с вами, чтобы уточнить детали и подтвердить время визита.`);
            form.reset();
            // Reset slider to middle
            afterImage.style.width = "50%";
            handle.style.left = "50%";
        })
        .catch(err => {
            console.error(err);
            alert("Произошла ошибка при отправке записи. Пожалуйста, попробуйте еще раз или свяжитесь с нами по телефону.");
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        });
    });
});
