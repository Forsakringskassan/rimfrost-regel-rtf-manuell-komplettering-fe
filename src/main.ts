import { createApp } from "vue";
import { ValidationPlugin } from "@fkui/vue";
import { createPinia } from "pinia";
import "@fkui/design";
import "./main.scss";
import App from "./App.vue";

const app = createApp(App);
app.use(ValidationPlugin);
app.use(createPinia());
app.mount("#app");
