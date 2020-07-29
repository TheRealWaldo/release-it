 #!/bin/sh

if [ "$2" == "merge" ] || [ "$2" == "commit" ]; then
    exit
fi

ISSUE_KEY=`git branch | grep -o "\* \(.*/\)*[A-Z]\{2,\}-[0-9]\+" | grep -o "[A-Z]\{2,\}-[0-9]\+"`

if [ $? -ne 0 ]; then
    exit
fi

cat $1

echo "$(cat $1) $ISSUE_KEY" > "$1"
