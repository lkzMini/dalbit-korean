# Dalbit — coreano en micro-sesiones

Aplicación personal para construir vocabulario coreano con sesiones breves, repaso espaciado y progreso local visible. Está pensada para principiantes que ya leen Hangul básico.

## Probarla

1. Serví la raíz por HTTP: `python -m http.server 8000`.
2. Abrí `http://localhost:8000/`.
3. Ejecutá la lógica automatizada con `npm test` y la validación de sintaxis con `npm run check`.

## Motor de aprendizaje v1

- Currículo progresivo de 60 palabras en seis unidades, sin Hanja.
- Sesiones adaptativas de ocho palabras, con un máximo de dos nuevas.
- Repaso determinista por dominio, fecha, errores recientes y lapsos.
- Ejercicios Hangul → español, español → Hangul, audio `ko-KR` y escritura gradual.
- Panel de estados, racha, precisión reciente, actividad semanal y avance por unidad.
- Vocabulario filtrable; romanización secundaria y ocultable.
- Persistencia local versionada, migración de `dalbit-progress-v1`, exportación, importación y reinicio confirmado.

## Decisiones

| Área | Decisión |
|---|---|
| Arquitectura | Módulos ES nativos: currículo, repaso, sesiones, almacenamiento, métricas e interfaz. |
| Repaso | Niveles 0–5 con intervalos de 1, 3, 7, 14 y 30 días; un error baja nivel y vence el repaso hoy. |
| Sesión | Prioridad: vencidas, falladas, en aprendizaje y hasta dos nuevas; una palabra aparece una sola vez por sesión. |
| Audio | `speechSynthesis` con voz coreana; si no existe, el ejercicio vuelve a reconocimiento visual. |
| Datos | Sin backend ni dependencias de ejecución. Un dato ilegible se respalda antes de empezar un estado nuevo. |
| Despliegue | Rutas relativas para conservar compatibilidad con GitHub Pages en `/dalbit-korean/`. |

Producción: <https://lkzmini.github.io/dalbit-korean/>
