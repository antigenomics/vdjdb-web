/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

package backend.utils

import play.api.mvc.RequestHeader

/** Client-IP resolution for anything that rate-limits or quotas per IP.
  *
  * Any limit keyed on a client-supplied header is not a limit: a caller who can choose their own
  * identity can mint as many identities as they like. This is the single implementation both the
  * request limiter and temporary-account signup use.
  */
object RequestUtils {

  /** Loopback + RFC1918. These are the hops our own edge adds, so they are skipped when looking for
    * the client. If the edge ever appends a *public* hop, this list must grow to include it. */
  private val trustedProxy = "^(127\\.|::1|10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[01])\\.)".r

  private def isTrusted(ip: String): Boolean = trustedProxy.findFirstIn(ip).isDefined

  /** The client as observed by our edge.
    *
    * Behind the pangolin edge the real client arrives in `X-Forwarded-For` (e.g. `"<client>, 127.0.0.1"`).
    * Take the right-most hop that is not a trusted proxy: that is the hop the edge itself set, and a
    * client-injected prefix stays to its left where it cannot win.
    *
    * `X-Real-IP` is only honoured when the request actually reached us through a trusted proxy —
    * otherwise anyone connecting directly to the container could simply assert whatever IP they liked.
    */
  def clientIp(request: RequestHeader): String = {
    val forwarded = request.headers
      .get("X-Forwarded-For").getOrElse("")
      .split(",").map(_.trim).filter(_.nonEmpty)

    forwarded.reverse
      .find(ip => !isTrusted(ip))
      .orElse(if (isTrusted(request.remoteAddress)) request.headers.get("X-Real-IP") else None)
      .getOrElse(request.remoteAddress)
  }
}
