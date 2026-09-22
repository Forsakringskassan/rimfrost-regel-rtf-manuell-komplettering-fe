import "@fkui/design";
import "./main.scss";
import { init } from "./index";

// The standalone entry goes through the same init() the host uses, so the
// exported entry point is exercised by every `npm run dev` rather than only
// existing. The stylesheets stay here: they must not reach the federated build.
init("#app");
