package backend.server.limit

case class IpLimit(var requestCount: Int, var requestTime: Long) {
    def clearCount(): Unit = {
        requestCount = 0
    }

    def clearTime(): Unit = {
        requestTime = 0
    }
}