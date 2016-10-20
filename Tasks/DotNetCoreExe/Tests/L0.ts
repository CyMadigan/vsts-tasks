import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'vsts-task-lib/mock-test';
import os = require('os');
import fs = require('fs');

describe('DotNetCoreExe Suite', function () {
    before(() => {
    });

   after(function () {
    });

    it('fails if the dotnet tool is not found', (done: MochaDone) => {
        let tp = path.join(__dirname, 'dotnetExeNotFound.js')
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.invokedToolCount == 0, 'should not have invoked any tool');
        assert(tr.failed, 'task should have failed');
        assert(tr.errorIssues.length > 0, "error reason should have been recorded");
        console.log(tr.errorIssues[0]);
        done();
    }),

    it ('restore works with explicit project files', (done: MochaDone) => {

        let tp = path.join(__dirname, 'validInputs.js')
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        tr.run();

        assert(tr.invokedToolCount == 3, 'should have invoked tool once');
        assert(tr.succeeded, 'task should have succeeded');
        done();
    })
});