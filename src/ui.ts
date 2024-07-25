import Mixpanel from "./mixpanel";
import { mixpanelToken } from "./private_mixpanelToken"; // It's just this: mixpanelToken:string = "YOUR_PROJECT_TOKEN"

const mixpanel = new Mixpanel(mixpanelToken);

window.onmessage = async (event) => {
  console.log("window.onmessage");
  const message = event.data.pluginMessage;
  console.log(`  message.type: ${message.type}`);

  if (message.type === "identify") {
    mixpanel.identify(message.userId);
    try {
      await mixpanel.track("Plugin Started");
      console.log("  so far so good");
    } catch (error) {
      console.log('catched err')
      parent.postMessage(
        { pluginMessage: { type: "mixpanel-init-fail", val: true } },
        "*"
      );
      
    }
  }

  if (message.type === "track") {
    await mixpanel.track(message.data.track);
    parent.postMessage(
      { pluginMessage: { type: "track-done", data: message.data.msg } },
      "*"
    );
  }
};
