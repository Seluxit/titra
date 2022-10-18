#/bin/bash

VERSION="1.0.0"
IMG="registry.seluxit.com/seluxit/titra:${VERSION}"

#git checkout timesheet
docker build . -t $IMG
docker push $IMG
