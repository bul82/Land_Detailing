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
    const tooltip = inspectionCard.querySelector("#markerTooltip");
    const scrollHintTarget = inspectionCard;

    function showMarkerDetails(pin) {
        const zone = pin.dataset.zone || "";
        inspectionCard.dataset.activeZone = zone;
        inspectionCard.querySelectorAll(".map-callout.is-active, .inspection-table__row.is-active").forEach((item) => {
            item.classList.remove("is-active");
            item.style.backgroundColor = "";
            item.style.borderColor = "";
            item.style.boxShadow = "";
        });
        const activeCallout = inspectionCard.querySelector(`.map-callout[data-zone="${zone}"]`);
        const activeRow = inspectionCard.querySelector(`.inspection-table__row[data-zone="${zone}"]`);
        activeCallout?.classList.add("is-active");
        activeRow?.classList.add("is-active");
        if (activeCallout) {
            activeCallout.style.backgroundColor = "rgba(255, 255, 255, 0.78)";
            activeCallout.style.borderColor = "rgba(24, 24, 24, 0.12)";
            activeCallout.style.boxShadow = "0 8px 22px rgba(32, 28, 22, 0.06)";
        }
        if (activeRow) {
            activeRow.style.backgroundColor = "#fff9f4";
            activeRow.style.boxShadow = "inset 3px 0 0 var(--accent)";
        }

        if (!tooltip) return;

        tooltip.innerHTML = `
            <strong>${pin.dataset.title || ""}</strong>
            <span>${pin.dataset.status || ""} · ${pin.dataset.thickness || ""}</span>
            <em>${pin.dataset.recommendation || ""}</em>
        `;

        const mapRect = inspectionCard.querySelector(".inspection-card__map").getBoundingClientRect();
        const pinRect = pin.getBoundingClientRect();
        const pinLeft = pinRect.left - mapRect.left;
        const pinTop = pinRect.top - mapRect.top;
        const tooltipOffsets = {
            hood: { x: 38, y: -82 },
            roof: { x: 42, y: -32 },
            leftDoor: { x: -220, y: -32 },
            rightFender: { x: 40, y: -30 },
            leftFender: { x: -220, y: -28 },
            trunk: { x: 42, y: -78 }
        };
        const offset = tooltipOffsets[zone] || { x: 34, y: -30 };
        const left = pinLeft + offset.x;
        const top = pinTop + offset.y;

        tooltip.style.left = `${Math.max(18, Math.min(left, mapRect.width - 230))}px`;
        tooltip.style.top = `${Math.max(18, Math.min(top, mapRect.height - 112))}px`;
        tooltip.style.setProperty("opacity", "1", "important");
        tooltip.classList.add("is-visible");
    }

    function hideMarkerDetails() {
        delete inspectionCard.dataset.activeZone;
        inspectionCard.querySelectorAll(".map-callout.is-active, .inspection-table__row.is-active").forEach((item) => {
            item.classList.remove("is-active");
            item.style.backgroundColor = "";
            item.style.borderColor = "";
            item.style.boxShadow = "";
        });
        if (tooltip) tooltip.style.removeProperty("opacity");
        tooltip?.classList.remove("is-visible");
    }

    inspectionCard.querySelectorAll(".car-pin").forEach((pin) => {
        pin.addEventListener("mouseenter", () => showMarkerDetails(pin));
        pin.addEventListener("mouseleave", hideMarkerDetails);
        pin.addEventListener("focus", () => showMarkerDetails(pin));
        pin.addEventListener("blur", hideMarkerDetails);
    });

    scrollHintTarget.addEventListener("scroll", () => {
        if (scrollHintTarget.scrollLeft > 12) {
            scrollHintTarget.classList.add("has-scrolled");
        }
    }, { passive: true });
})();
