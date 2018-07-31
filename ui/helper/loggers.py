import logging
from socketIO_client import SocketIO


class OutputHandler(logging.Handler):

    def __init__(self, socket, *args, **kwargs):
        logging.Handler.__init__(self, *args, **kwargs)
        self.socketio = socket

    def emit(self, record):
        self.socketio.emit('logging', self.format(record))


class StreamToLogger(object):
    """
    Fake file-like stream object that redirects writes to a logger instance.
    """

    def __init__(self, logger, log_level):
        self.logger = logger
        self.log_level = log_level
        self.linebuf = ''

    def write(self, buf):
        for line in buf.rstrip().splitlines():
            self.logger.log(self.log_level, line.rstrip())