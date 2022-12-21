import * as utils from "@dcl/ecs-scene-utils";
import {
  joinSocketServer,
  unos,
  uno_bot,
} from "./uno/wsConnection";

import { UNO } from "./uno/uno";

import { getUserData } from "@decentraland/Identity";

export let sceneStarted = false;


const canvas = new UICanvas();

const textCanvas = new UICanvas();
const textContainer = new UIContainerStack(textCanvas);
textContainer.adaptWidth = true;
textContainer.adaptHeight = true;
textContainer.width = "50%";
textContainer.height = "10%";
textContainer.color = Color4.Yellow();
textContainer.hAlign = "center";
textContainer.vAlign = "center";
textContainer.stackOrientation = UIStackOrientation.VERTICAL;
textContainer.opacity = 0.4;
const text = new UIText(textCanvas);
text.value = `You didn't select quiz category yet!`;
text.width = 76;
text.height = 76;
text.hAlign = "center";
text.vAlign = "center";
text.fontSize = 25;
text.color = Color4.Black();
text.hTextAlign = "center";
text.vTextAlign = "center";
textContainer.visible = false;
text.visible = false;

async function setUpScene() {
  let socket: WebSocket = await joinSocketServer();
  try {
    for (let i = 0; i < 1; i++) {
      const uno = new UNO(
        i,
        new Transform({ position: new Vector3(4 * (i % 4), 0, 0) }),
        socket,
        canvas,
        uno_bot
      );
      unos.push(uno);
    }
  } catch (e) {
    log(JSON.stringify(e));
  }

  );
}

let uiArea = new Entity();
uiArea.addComponent(
  new Transform({
    position: new Vector3(16, 0, 16),
    scale: new Vector3(100, 100, 100),
  })
);
engine.addEntity(uiArea);

uiArea.addComponent(
  new utils.TriggerComponent(
    new utils.TriggerBoxShape(new Vector3(32, 32, 32), Vector3.Zero()),
    {
      onCameraEnter: () => {
        if (!sceneStarted) {
          log("scene started");
          setUpScene();
          sceneStarted = true;
        }
      },
      onCameraExit: () => {},
    }
  )
);