export function findFiles (projects: string, includeFolder: boolean) : string[] {
        if (projects == "**/project.json") {
            return ["web/project.json", "web.tests/project.json", "lib/project.json"];
        }
    }