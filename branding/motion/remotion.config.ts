import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Crisp text + clean gradients for a dark brand reveal.
Config.setChromiumOpenGlRenderer("angle");
