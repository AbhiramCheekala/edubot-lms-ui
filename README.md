# React + TypeScript + Vite
Deployment check
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json', './tsconfig.app.json'],
    tsconfigRootDir: __dirname,
  },
}
``` 

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list


The following components have updates available:
- alert-dialog
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\alert-dialog.tsx
- avatar
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\avatar.tsx
- badge
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\badge.tsx
- button
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\button.tsx
- calendar
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\calendar.tsx
- card
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\card.tsx
- chart
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\chart.tsx
- checkbox
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\checkbox.tsx
- command
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\command.tsx
- dialog
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\dialog.tsx
- form
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\form.tsx
- input
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\input.tsx
- label
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\label.tsx
- popover
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\popover.tsx
- scroll-area
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\scroll-area.tsx
- select
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\select.tsx
- separator
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\separator.tsx
- toast
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\toast.tsx
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\use-toast.ts
  - D:\AddUserPage\edubot-lms-ui\src\components\ui\toaster.tsx
