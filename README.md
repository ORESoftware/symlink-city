


# Creates hardlinks in place of symlinks for purposes of copying to Docker containers. 
## This project forms a duality of sorts with [`npm-link-up`](https://github.com/ORESoftware/npm-link-up).


# Installation

```bash
$ npm install -g symlink-city
```

# Usage

```bash
$ symlinkcity
```


# What it do

It goes through all top level directories in your local node_modules directory, for any symlinked directories,
it uses readlink to find the source files and then creates a hardlink in place of the symlink. This is useful
when using Docker, which doesn't work with symlinks but works with hardlinks.



