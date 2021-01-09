#!/bin/bash

npm install
npm run build

git add . 
git commit -m "$1"
git tag -a -m "$1" v1
git push --follow-tags