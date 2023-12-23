import Mixpanel from "./mixpanel";
import { mixpanelToken } from "./private_mixpanelToken"; // It's just this: mixpanelToken:string = "YOUR_PROJECT_TOKEN"

const mixpanel = new Mixpanel(mixpanelToken);

window.onmessage = async (event) => {
  console.log("window.onmessage");
  const message = event.data.pluginMessage;
  console.log(`  message.type: ${message.type}`);

  if (message.type === "identify") {
    mixpanel.identify(message.userId);
    await mixpanel.track("Plugin Started");
    console.log("  so far so good");
    parent.postMessage(
      { pluginMessage: { type: "initialized", val: true } },
      "*"
    );
  }

  if (message.type === "track") {
    await mixpanel.track(message.data);
    parent.postMessage(
      { pluginMessage: { type: "track-done", val: true } },
      "*"
    );
  }
};
