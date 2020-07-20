#!/bin/bash

filePath=$3
relativePath=${filepath#./downloads/}
topPath=./downloads/${relativePath%%/*} # It will be the path of folder when it has multiple files, otherwise it will be the same as file path.

LIGHT_GREEN_FONT_PREFIX="\033[1;32m"
FONT_COLOR_SUFFIX="\033[0m"
INFO="[${LIGHT_GREEN_FONT_PREFIX}INFO${FONT_COLOR_SUFFIX}]"

echo -e "$(date +"%m/%d %H:%M:%S") ${INFO} Delete .aria2 file ..." >> ./downloads/downlog.txt

if [ $2 -eq 0 ]; then
    exit 0
elif [ -e "${filepath}.aria2" ]; then
    rm -vf "${filepath}.aria2"
elif [ -e "${topPath}.aria2" ]; then
    rm -vf "${topPath}.aria2"
fi
echo -e "$(date +"%m/%d %H:%M:%S") ${INFO} Delete .aria2 file finish" >> ./downloads/downlog.txt

imageSuffix = ".jpg"
if [[ $3 == *$imageSuffix ]]; then
    echo "$3 -> image exit!" >> ./downloads/downlog.txt
    exit
fi

echo "$(($(cat numUpload)+1))" > numUpload # Plus 1
echo "numUpload -> $(($(cat numUpload)+1))" >> ./downloads/downlog.txt

if [[ $2 -eq 1 ]]; then # single file
    remote="DRIVE:$RCLONE_DESTINATION/${relativePath%/*}"
    echo "begin $topPath to $remote ..." >> ./downloads/downlog.txt
	rclone -v --config="rclone.conf" copy "$topPath" "$remote" 2>&1	
    echo "begin rm $3 ..." >> ./downloads/downlog.txt
    rm -vf "$3"
elif [[ $2 -gt 1 ]]; then # multiple file
	rclone -v --config="rclone.conf" copy "$topPath" "DRIVE:$RCLONE_DESTINATION/${relativePath%%/*}"
    rm -rf "$topPath"
    echo "begin rm $topPath ..." >> ./downloads/downlog.txt
fi

echo "$(($(cat numUpload)-1))" > numUpload # Minus 1
echo "numUpload -> $(($(cat numUpload)-1))" >> ./downloads/downlog.txt