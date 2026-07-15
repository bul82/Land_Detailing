document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-loading");

    const preloader = document.getElementById("preloader");
    window.setTimeout(() => {
        preloader.classList.add("is-hidden");
        document.body.classList.remove("is-loading");
    }, 120);

    const cursorDot = document.getElementById("cursorDot");
    const cursorLabel = document.getElementById("cursorLabel");
    const supportsFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (supportsFinePointer && cursorDot && cursorLabel) {
        window.addEventListener("mousemove", (event) => {
            cursorDot.style.left = `${event.clientX}px`;
            cursorDot.style.top = `${event.clientY}px`;
            cursorLabel.style.left = `${event.clientX}px`;
            cursorLabel.style.top = `${event.clientY}px`;
        });

        document.querySelectorAll(".inspection-area").forEach((area) => {
            area.addEventListener("mouseenter", () => {
                cursorDot.classList.add("is-inspecting");
                cursorLabel.classList.add("is-visible");
            });
            area.addEventListener("mouseleave", () => {
                cursorDot.classList.remove("is-inspecting");
                cursorLabel.classList.remove("is-visible");
            });
        });

        document.querySelectorAll(".service-card").forEach((card) => {
            card.addEventListener("mouseenter", () => cursorDot.classList.add("is-card"));
            card.addEventListener("mouseleave", () => cursorDot.classList.remove("is-card"));
        });
    }

    const form = document.getElementById("detailingForm");
    if (!form) return;

    const submitBtn = form.querySelector(".submit-btn");
    const visitDateInput = form.date;
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    visitDateInput.min = today.toISOString().slice(0, 10);

    function isValidText(value, maxLength) {
        return value.length > 0 && value.length <= maxLength;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();

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
            alert("Выберите актуальную дату осмотра.");
            return;
        }

        const message =
            `Запись на осмотр покрытия:\n` +
            `- Что важно сейчас: ${serviceText}\n` +
            `- Автомобиль: ${carModel}\n` +
            `- Дата: ${date} в ${time}`;

        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Отправляем...";

        fetch("/api/feedback", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                contact,
                message,
                source: "detailing"
            })
        })
            .then((res) => {
                if (!res.ok) throw new Error("Server error");
                return res.json();
            })
            .then(() => {
                alert(`Спасибо, ${name}. Заявка на осмотр отправлена. Свяжемся, чтобы уточнить состояние авто и удобное время.`);
                form.reset();
                visitDateInput.min = today.toISOString().slice(0, 10);
            })
            .catch((err) => {
                console.error(err);
                alert("Не получилось отправить заявку. Попробуйте еще раз или напишите нам напрямую.");
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            });
    });
});
document.querySelectorAll('img').forEach((img) => {
  img.setAttribute('draggable', 'false');
});

document.addEventListener('dragstart', (event) => {
  if (event.target instanceof HTMLImageElement) {
    event.preventDefault();
  }
});

(() => {
    const inspectionCard = document.querySelector(".inspection-card");
    if (!inspectionCard) return;

    inspectionCard.querySelectorAll(".car-pin").forEach((pin) => {
        pin.addEventListener("mouseenter", () => {
            inspectionCard.dataset.activeZone = pin.dataset.zone || "";
        });

        pin.addEventListener("mouseleave", () => {
            delete inspectionCard.dataset.activeZone;
        });

        pin.addEventListener("focus", () => {
            inspectionCard.dataset.activeZone = pin.dataset.zone || "";
        });

        pin.addEventListener("blur", () => {
            delete inspectionCard.dataset.activeZone;
        });
    });
})();
