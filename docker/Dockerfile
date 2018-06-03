FROM lambci/lambda-base

ENV PATH=/var/lang/bin:/usr/local/bin:/usr/bin/:/bin \
    LD_LIBRARY_PATH=/var/lang/lib:/lib64:/usr/lib64:/var/runtime:/var/runtime/lib:/var/task:/var/task/lib \
    AWS_EXECUTION_ENV=AWS_Lambda_nodejs8.10 \
    NODE_PATH=/var/runtime:/var/task:/var/runtime/node_modules

RUN rm -rf /var/runtime /var/lang && \
  curl https://lambci.s3.amazonaws.com/fs/nodejs8.10.tgz | tar -zx -C /

COPY awslambda-mock.js /var/runtime/node_modules/awslambda/build/Release/awslambda.js

# Install puppeteer dependencies for Docker
# See https://github.com/GoogleChrome/puppeteer/blob/master/docs/troubleshooting.md#running-puppeteer-in-docker
COPY google-chrome.repo /etc/yum.repos.d/google-chrome.repo

RUN yum check-update
# RUN yum install -y wget
RUN yum install -y -q yum-plugin-ovl
RUN rpm --rebuilddb
RUN yum install -y -q pango
# RUN yum install -y -q cups-libs
RUN yum install -y -q dbus-glib 
RUN yum install -y -q libXrandr 
RUN yum install -y -q libXcursor 
RUN yum install -y -q libXinerama
# RUN yum install -y -q cairo
RUN yum install -y -q cairo-gobject
RUN rpm -ivh --nosignature --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/atk-2.22.0-3.el7.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/at-spi2-atk-2.22.0-2.el7.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://mirror.centos.org/centos/7/os/x86_64/Packages/at-spi2-core-2.22.0-1.el7.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/g/GConf2-3.2.6-7.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libXScrnSaver-1.2.2-6.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libxkbcommon-0.3.1-1.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libwayland-client-1.2.0-3.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/l/libwayland-cursor-1.2.0-3.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/20/Fedora/x86_64/os/Packages/g/gtk3-3.10.4-1.fc20.x86_64.rpm
RUN rpm -ivh --nosignature --nodeps http://dl.fedoraproject.org/pub/archive/fedora/linux/releases/16/Fedora/x86_64/os/Packages/gdk-pixbuf2-2.24.0-1.fc16.x86_64.rpm
# RUN yum install -y ip-gothic-fonts wqy-zenhei-fonts fonts-thai-tlwg fonts-kacst ttf-freefont 
COPY fonts.conf /etc/fonts/fonts.conf
COPY 30-metric-aliases.conf /etc/fonts/conf.d/30-metric-aliases.conf
COPY 40-nonlatin.conf /etc/fonts/conf.d/40-nonlatin.conf
COPY 45-latin.conf /etc/fonts/conf.d/45-latin.conf

ENTRYPOINT ["/var/lang/bin/node", "--expose-gc", "--max-semi-space-size=150", "--max-old-space-size=2707", \
  "/var/runtime/node_modules/awslambda/index.js"]