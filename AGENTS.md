# Proyecto Inventrapp

Inventrapp es una plataforma SaaS de gestión comercial multi-negocio.

Está orientada a negocios como:
- papelerías
- ferreterías
- librerías
- tiendas
- distribuidores
- pequeños y medianos comercios

Cada negocio debe mantener sus datos completamente separados.

## Tecnología actual

- React
- TypeScript
- Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- React Router
- Vercel
- GitHub

## Roles principales

- Super Admin global
- Administrador del negocio
- Empleados del negocio

## Módulos previstos

- Login
- Panel Super Admin
- Negocios
- Usuarios
- Roles y permisos
- Dashboard del negocio
- Inventario
- Compras
- Ventas y POS
- Cotizaciones
- Clientes
- Proveedores
- Caja
- Créditos
- Reportes
- Configuración
- Auditoría

## Reglas de desarrollo

1. Antes de modificar código, analiza la arquitectura y los archivos relacionados.
2. Respeta el diseño visual existente.
3. Mantén el aislamiento de datos entre negocios.
4. No rompas funcionalidades existentes.
5. Usa TypeScript correctamente y evita usar any.
6. Reutiliza componentes, tipos, hooks y servicios existentes.
7. Evita código duplicado.
8. Mantén separada la lógica de interfaz, servicios y acceso a Firebase.
9. Incluye validaciones, estados de carga y manejo de errores.
10. No expongas claves privadas ni variables sensibles.
11. No subas archivos .env al repositorio.
12. No cambies reglas de Firebase sin explicar el impacto.
13. Mantén compatibilidad con Vercel.
14. Cuando una tarea sea grande, divídela internamente en etapas.
15. No me pidas confirmación para decisiones técnicas pequeñas y seguras.
16. Si falta información imprescindible, pregúntame antes de asumir.

## Flujo obligatorio al terminar cada tarea

1. Revisa todos los archivos modificados.
2. Ejecuta npm run build.
3. Corrige todos los errores de TypeScript y compilación.
4. Ejecuta las pruebas disponibles.
5. Revisa git diff.
6. Ejecuta git add únicamente para los archivos de la tarea.
7. Crea un commit con un mensaje claro en español.
8. No ejecutes git push.
9. Entrégame un resumen con:
   - funcionalidad implementada;
   - archivos principales modificados;
   - pruebas ejecutadas;
   - mensaje del commit;
   - cualquier pendiente o riesgo.

Nunca incluyas en commits:
- .env
- .env.local
- .env.*.local
- claves de Firebase Admin
- node_modules
- archivos temporales
- credenciales

Después de crear AGENTS.md, revisa el proyecto completo, crea el commit correspondiente y espera mi siguiente instrucción.
