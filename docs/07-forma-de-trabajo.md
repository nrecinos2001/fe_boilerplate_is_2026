# Forma de trabajo

**Tablero:** **[Jira](https://jegonzalez2992.atlassian.net/jira/software/projects/IST/boards/3/backlog?atlOrigin=eyJpIjoiODY3MTJkNDczYTAzNDgxOGE0NmJkYTcwOTcwNzgwZjMiLCJwIjoiaiJ9)**

Cada historia se desarrolla en su propia rama y se integra con un PR. Una historia cuenta como terminada cuando su PR fue aprobado y fusionado a `develop`, quedó incluida en la versión 1.0.0 de `main` y funciona en el ambiente desplegado; en ese momento su card pasa a la columna Hecho con el enlace al PR.

## Ramas (Git Flow)

- `main`: código en producción. Recibe cambios desde `release/*` y `hotfix/*`.
- `develop`: rama de integración.
- `feature/<ID>-<descripcion>`: una rama por historia.
- `bugfix/<ID>-<descripcion>`: correcciones de defectos encontrados en las pruebas.
- `release/<version>` y `hotfix/<descripcion>`: publicación y correcciones de producción.

Los dos repositorios (frontend y backend) siguen el mismo flujo. Las historias que tocan ambos usan el mismo ID en una rama de cada repositorio.

## Commits

Formato `<tipo>(<ID>): <descripción>`, por ejemplo `feat(H5): valida el traslape de reservas`.

Tipos que usamos:  `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.

## Pull requests

- **Título:** incluye el ID de la historia, por ejemplo `H5: valida el traslape de reservas`.
- **Descripción:** qué cambia, enlace a la card del tablero y cómo se probó. *
- **Destino:** las ramas `feature/*` y `bugfix/*` van hacia `develop`. Solo `release/*` y `hotfix/*` van hacia `main`.
- **Aprobación:** la aprueba otro integrante del equipo, nunca quien lo abrió.
- **Fusión:** se fusiona después de la aprobación de un miembro del equipo
- **Tablero:** al fusionar, la card pasa a Hecho con el enlace al PR.
