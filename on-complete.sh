#!/bin/bash

filePath=$3
relativePath=${filepath#./downloads/}
topPath=./downloads/${relativePath%%/*} # It will be the path of folder when it has multiple files, otherwise it will be the same as file path.

LIGHT_GREEN_FONT_PREFIX="\033[1;32m"
FONT_COLOR_SUFFIX="\033[0m"
INFO="[${LIGHT_GREEN_FONT_PREFIX}INFO${FONT_COLOR_SUFFIX}]"

echo -e "$(date +"%m/%d %H:%M:%S") ${INFO} Delete .aria2 file ..."

if [ $2 -eq 0 ]; then
    exit 0
elif [ -e "${filepath}.aria2" ]; then
    rm -vf "${filepath}.aria2"
elif [ -e "${topPath}.aria2" ]; then
    rm -vf "${topPath}.aria2"
fi
echo -e "$(date +"%m/%d %H:%M:%S") ${INFO} Delete .aria2 file finish"
echo "$(($(cat numUpload)+1))" > numUpload # Plus 1

RCLONE_EXIT_CODE=0

if [[ $2 -eq 1 ]]; then # single file
	rclone -v --config="rclone.conf" copy "$3" "DRIVE:$RCLONE_DESTINATION/${relativePath%%/*}" 2>&1	
    RCLONE_EXIT_CODE=$?
    rm -vf "$3"
elif [[ $2 -gt 1 ]]; then # multiple file
	rclone -v --config="rclone.conf" copy "$topPath" "DRIVE:$RCLONE_DESTINATION/${relativePath%%/*}"
    RCLONE_EXIT_CODE=$?
    rm -rf "$topPath"
fi

if [ ${RCLONE_EXIT_CODE} -eq 0 ]; then
    curl "https://heroku.vpss.me/done?host=${HEROKU_APP_NAME}.herokuapp.com&id=${id}&succ=1"
else
    curl "https://heroku.vpss.me/done?host=${HEROKU_APP_NAME}.herokuapp.com&id=${id}&succ=0"
fi

echo "$(($(cat numUpload)-1))" > numUpload # Minus 1
