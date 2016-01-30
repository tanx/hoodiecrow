#!/bin/sh

# abort if tests fail
set -e

# go to root
cd `dirname $0`
cd ..

if [ "$#" -ne 1 ] ; then
    echo 'Usage: ./gh_pages_release.sh 0.0.0'
    exit 0
fi

# install dependencies
npm install

# build and test
npm test

# set version
grunt deploy-gh-pages --release=$1
