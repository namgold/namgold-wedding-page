FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3
RUN adduser -D -u 10001 app && mkdir /data && chown app /data
COPY --from=build /out/api /usr/local/bin/api
USER app
ENV DB_PATH=/data/wedding.db
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["api"]
