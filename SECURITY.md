# Seguridad

Prácticas de seguridad del repositorio. Objetivo: que **ningún secreto** (claves, tokens,
contraseñas) entre nunca en git.

## 1. Nada de secretos en el repo

- Las claves/tokens reales viven **solo** en el entorno de ejecución (variables de entorno,
  gestor de secretos, o la configuración del servicio), nunca en código ni en docs.
- Usa un fichero `.env` **local** (ignorado por git) para tus secretos. Si el proyecto necesita
  documentar qué variables hacen falta, hazlo con un `.env.example` de placeholders (`<...>`).
- En la documentación usa placeholders, nunca valores reales.

## 2. Pre-commit anti-secretos (Gitleaks)

El repo trae un hook en `.githooks/pre-commit` que bloquea el commit si detecta un posible
secreto. **Cada quien debe activarlo una vez tras clonar:**

```bash
git config core.hooksPath .githooks
```

Usa [Gitleaks](https://github.com/gitleaks/gitleaks) si está instalado (recomendado); si no, cae
a un escáner de respaldo por regex. Instalar Gitleaks:

```bash
# Windows:  winget install gitleaks   (o: scoop install gitleaks)
# macOS:    brew install gitleaks
```

Reglas/allowlist en `.gitleaks.toml`. Escaneo manual de todo el historial:

```bash
gitleaks detect -c .gitleaks.toml
```

## 3. Rotación de credenciales (rutina)

Rota las credenciales periódicamente y **siempre** que una haya podido quedar expuesta (subida a
un repo aunque fuera un segundo, pegada en un chat/IA, en un log, etc.):

- **Contraseñas de BBDD / servicios:** cada 3–6 meses.
- **Tokens de bot / claves de API:** cada 6–12 meses, o de inmediato ante sospecha.

Tras rotar, actualiza el valor en todos los sitios que lo usan (entorno, servicios, integraciones).

**Mínimo privilegio:** al crear un token/usuario, concede solo los permisos que necesita. Es
preferible empezar con menos y ampliar.

## 4. Si expones un secreto por error

1. **Revócalo/rótalo ya** (no basta con borrar el commit; ya pudo quedar cacheado/indexado).
2. Genera uno nuevo y actualízalo donde toque.
3. Comprueba el historial: `gitleaks detect -c .gitleaks.toml`.
