FROM amazonlinux:latest
# Set up dependencies / Java
RUN yum -y update && \
    yum -y install tar gzip findutils systemd-udev jq awscli unzip procps-ng && \
    cd /usr/local && \
    CORETTO_DOWNLOAD_URL="amazon-corretto-22-x64-linux-jdk.tar.gz" && \
    curl -LO https://corretto.aws/downloads/latest/${CORETTO_DOWNLOAD_URL} && \    
    tar -xvf ${CORETTO_DOWNLOAD_URL} && \
    JAVA_INSTALL=$(find /usr/local/amazon-corretto-22* -maxdepth 0 -type d) && \
    update-alternatives --install /usr/bin/java java ${JAVA_INSTALL}/bin/java 1

# Retrieve latest version of the minecraft JAR
RUN mkdir /minecraft && \
    cd /minecraft && \
    curl -LO https://launchermeta.mojang.com/mc/game/version_manifest.json && \
    LATEST_VERSION=$(cat version_manifest.json | jq -r '.latest.release') && \
    LATEST_VERSION_URL=$(cat version_manifest.json | jq -r --arg LATEST_VERSION "$LATEST_VERSION" '.versions[] | select(.id == $LATEST_VERSION) | .url') && \
    curl -LO $LATEST_VERSION_URL && \
    LATEST_VERSION_JAR=$(cat ${LATEST_VERSION}.json | jq -r '.downloads.server.url') && \
    curl -LO $LATEST_VERSION_JAR && \
    rm *.json && \
    echo eula=true >eula.txt

# Copy the startup and shutdown scripts, ensuring game files are backed up
COPY start_game.sh stop_game.sh entry_script.sh /minecraft/
EXPOSE 25565
CMD /minecraft/entry_script.sh