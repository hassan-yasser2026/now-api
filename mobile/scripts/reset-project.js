#!/usr/bin/env node

/**
 * This script resets the project to a blank state.
 * It either moves or deletes the /app, /components, /hooks, /constants, /scripts directories
 * and creates a fresh /app directory with index.tsx and _layout.tsx.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { stdin: input, stdout: output } = require("process");

const root = process.cwd();
const oldDirs = ["app", "components", "hooks", "constants", "scripts"];
const exampleDir = "app-example";
const newAppDir = "app";
const exampleDirPath = path.join(root, exampleDir);

const indexContent = `import { Text, View } from "react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
`;

const layoutContent = `import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
`;

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Do you want to move existing files to /app-example instead of deleting them? (Y/n): "
    );
    const userInput = answer.trim().toLowerCase() || "y";

    if (userInput !== "y" && userInput !== "n") {
      console.log("❌ Invalid input. Please enter 'Y' or 'N'.");
      return;
    }

    // Create app-example if needed
    if (userInput === "y") {
      await fs.promises.mkdir(exampleDirPath, { recursive: true });
      console.log(`📁 /${exampleDir} directory created.`);
    }

    // Move or delete old directories
    for (const dir of oldDirs) {
      const oldDirPath = path.join(root, dir);
      if (fs.existsSync(oldDirPath)) {
        if (userInput === "y") {
          const newDirPath = path.join(root, exampleDir, dir);
          await fs.promises.rename(oldDirPath, newDirPath);
          console.log(`➡️ /${dir} moved to /${exampleDir}/${dir}.`);
        } else {
          await fs.promises.rm(oldDirPath, { recursive: true, force: true });
          console.log(`❌ /${dir} deleted.`);
        }
      } else {
        console.log(`➡️ /${dir} does not exist, skipping.`);
      }
    }

    // Create fresh /app directory
    const newAppDirPath = path.join(root, newAppDir);
    await fs.promises.mkdir(newAppDirPath, { recursive: true });
    console.log("\n📁 New /app directory created.");

    // Write index.tsx
    const indexPath = path.join(newAppDirPath, "index.tsx");
    await fs.promises.writeFile(indexPath, indexContent);
    console.log("📄 app/index.tsx created.");

    // Write _layout.tsx
    const layoutPath = path.join(newAppDirPath, "_layout.tsx");
    await fs.promises.writeFile(layoutPath, layoutContent);
    console.log("📄 app/_layout.tsx created.");

    console.log("\n✅ Project reset complete. Next steps:");
    console.log(
      "1. Run `npx expo start` to start a development server.\n" +
        "2. Edit app/index.tsx to edit the main screen." +
        (userInput === "y"
          ? "\n3. Delete the /app-example directory when you're done referencing it."
          : "")
    );
  } catch (error) {
    console.error(`❌ Error during script execution: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();