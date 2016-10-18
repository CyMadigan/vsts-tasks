import tl = require("vsts-task-lib/task");
import path = require("path");
import fs = require("fs");
import ffl = require('find-files-legacy/findfiles.legacy');
var gulp = require('gulp');
var zip = require('gulp-zip');
var minimist = require('minimist');

export class dotNetExe {
    private command: string;
    private projects: string;
    private arguments: string;
    private publishWebProjects: boolean;
    private zipAfterPublish: boolean;
    private outputArgument: string;
    private remainingArgument: string;

    constructor() {
        this.command = tl.getInput("command");
        this.projects = tl.getInput("projects", false);
        this.arguments = tl.getInput("arguments", false);
        this.publishWebProjects = tl.getBoolInput("publishWebProjects", false);
        this.zipAfterPublish = tl.getBoolInput("zipAfterPublish", false);
    }

    public async execute() {
        var dotnetPath = tl.which("dotnet", true);

        this.updateOutputArgument();

        var projectFiles: string[] = (this.command === "publish" && this.publishWebProjects)
            ? this.getWebProjects()
            : ffl.findFiles(this.projects, false);

        for (var fileIndex in projectFiles) {
            var projectFile = projectFiles[fileIndex];
            try {
                var dotnet = tl.tool(dotnetPath);
                dotnet.arg(this.command);
                dotnet.arg(projectFile);
                dotnet.line(this.getCommandArguments(projectFile));

                var result = dotnet.execSync();
                if (result.code != 0) {
                    tl.setResult(result.code, "Command failed with non-zero exit code.");
                }

                await this.zipAfterPublishIfRequired(projectFile);

            }
            catch (err)
            {
                tl.setResult(1, err.message);
            }
        }
    }

    private async zipAfterPublishIfRequired(projectFile: string) {
        if (this.command === "publish" && this.zipAfterPublish) {
            var outputSource: string = "";
            if (this.outputArgument) {
                outputSource = path.join(this.outputArgument, path.basename(path.dirname(projectFile)));
            }
            else {
                var pattern = path.dirname(projectFile) + "/**/publish";
                var files = ffl.findFiles(pattern, true);
                for (var fileIndex in files) {
                    var file = files[fileIndex];
                    if (fs.lstatSync(file).isDirectory) {
                        outputSource = file;
                        break;
                    }
                }
            }

            var outputTarget = outputSource + ".zip";
            if (tl.exist(outputSource)) {
                await this.zip(outputSource, outputTarget);
                tl.rmRF(outputSource, true);
            }
        }
    }

    private zip (source: string, target: string) {
        return new Promise((resolve, reject) => {
            gulp.src(path.join(source, '**', '*'))
            .pipe(zip(path.basename(target)))
            .pipe(gulp.dest(path.dirname(target))).on('end', function(error){
                resolve("");
                })});
    }

    private getCommandArguments(projectFile: string): string {
        if (this.command === "publish" && this.outputArgument) {
            var output = path.join(this.outputArgument, path.basename(path.dirname(projectFile)));
            return this.remainingArgument + ' --output ' + output;
        }

        return this.arguments;
    }

    private updateOutputArgument(): void {
        this.outputArgument = this.remainingArgument = "";
        if (this.command === "publish" && this.arguments) {
            this.arguments = this.arguments.trim();
            var i = 0;
            var isOutputOption = false;
            while (i < this.arguments.length) {
                var nextIndex = this.getNextTokenIndex(this.arguments, i);
                var token = this.arguments.substr(i, nextIndex - i).trim();
                var tokenUpper = token.toUpperCase();
                if (isOutputOption) {
                    this.outputArgument = token;
                    isOutputOption = false;
                }
                else if (tokenUpper === "--OUTPUT" || tokenUpper === "-O") {
                    isOutputOption = true;
                }
                else {
                    this.remainingArgument += (" " + token);
                }

                i = nextIndex;
            }
        }
    }

    private getNextTokenIndex (input, currentPosition): number {
        for(; currentPosition < input.length; currentPosition++)
        {
            if(input[currentPosition] == " " || input[currentPosition] == "\t") {
                for(; currentPosition < input.length; currentPosition++) {
                    if(input[currentPosition + 1] != " " && input[currentPosition + 1] != "\t") {
                        break;
                    }
                }

                break;
            }
            else if(input[currentPosition] === "\"") {
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "\"");
            }
            else if(input[currentPosition] === "'") {
                //keep going till this one closes
                currentPosition = this.findClosingQuoteIndex(input, currentPosition + 1, "'");
            }
            else if(input[currentPosition] === "\\") {
                currentPosition++; 
                if(currentPosition >= input.length) {
                    break;
                }
            }
        }
                                              
        return currentPosition;
    }

    private findClosingQuoteIndex (input, currentPosition, closingQuote): number {
        for(; currentPosition < input.length; currentPosition++) {
            if(input[currentPosition] === closingQuote)
            {
                break;
            }
            else if(input[currentPosition] === "\\") {
                currentPosition++;
                if(currentPosition >= input.length) {
                    break;
                }
            }
        }

        return currentPosition;
    }

     private getWebProjects(): string [] {
        var allFiles = ffl.findFiles("**/project.json", false);
        var webProjects = allFiles.filter(function(file, index, files): boolean {
            var directory = path.dirname(file);
            return fs.existsSync(path.join(directory, "web.config")) 
                || fs.existsSync(path.join(directory, "wwwroot"));
        });

        if (!webProjects.length) {
            tl.setResult(1, "No matching files were found for projects");
        }

        return webProjects;
    }
}

var exe = new dotNetExe();
exe.execute();