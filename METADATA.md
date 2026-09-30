# Diagram metadata

Metadata on cells in `kubesec-diagram.drawio.svg`. Edit in draw.io: Edit Data (`Ctrl+M`) on the cell. `kubesec-diagram.svg` is rendered from it (`npm run render`; CI does it on push): never edit that one.

| Attribute | Used for |
|---|---|
| `tags` | filtering, levels, priority styling |
| `slug` | pins (`pins=`), unique id of a help entry |
| `help` | tooltip / panel text |
| `overlay-definition` | on a legend line: its look is the overlay band of that name (`ingress`, `egress`) |
| `overlay` | on a line: the bands drawn along it, side by side in this order: the first on the left, looking along the arrow (`egress`, `ingress,egress`) |
| `overlay-destination` | on a box: `true` = bands end or start there, none passes through (a process several flows point at) |
| `arrow-at-each-box` | on a line: `true` repeats its arrowhead at every box drawn over it (priority circles and `?` markers excluded). On a box: `true` always, `false` never an arrow there |

## Casing

Only meta tags are lowercase. Everything else is PascalCase without `-`. Acronyms are written as words (`Api`, `Sbom`, `Vm`).

| Kind | Form | Values |
|---|---|---|
| meta tag | lowercase, `-` before a suffix | `level-1..3`, `pri-1..3`, `info`, `legend`, `css-<name>` |
| topic tag | PascalCase segments joined by `.` | the tree below |
| slug | PascalCase | unique per help entry |

## Topic rules

1. **A topic is a concept that can be explained or hidden on its own.** Depth is handled by `level-N`, never by a tag.
2. **Hierarchy by name.** Each `.`-separated segment is one level. The parent is the name without its last segment: `Network` → `Network.Egress` → `Network.Egress.Gateway`. A segment is PascalCase and may be several words (`Ingress.GatewayApi`). Max depth is 3.
3. **Ancestors are mandatory.** An element with `Network.Egress.Gateway` also has `Network.Egress` and `Network`. Hiding a parent then hides the whole branch. The runtime does not derive ancestors yet.
4. **Leaf preferred.** A parent alone is allowed only on hub elements that belong to the whole family (e.g. `API (kube-apiserver)` → `Api`).
5. **Multiple concepts allowed.** An element may carry several leaves (e.g. image-scanner/signer box → `SupplyChain.Scanning SupplyChain.Signing`).
6. **Core elements have no topic.** Cluster, nodes, Deployment/POD/Container/Process boxes get only `level-N`.
7. **Containment.** A box inside another box inherits all of the container's topic tags. Its level is at least the container's level.
8. **Lines.** A line has its own tags (optional) plus all topic tags of both endpoints. Its level is the max of the three. A line therefore never shows without both ends. A loose end that starts on another line (a junction) adds no box tags.
9. **Markers** (`pri-N` / `?`) inherit the topic tags and level of the box they sit on or in.
   - **A marker over lines** also gets the topic tags **common to all lines it covers**. Its level is at least the lowest level among those lines. It then hides together with the lines it annotates.
10. **Legend** cells have `legend` only.
11. **Traffic direction is relative to the pod.** `Network.Egress` = traffic leaving a pod, including egress into another pod's Service/EndpointSlice. `Network.Ingress` = traffic entering a pod, including the external path via LB/NodePort/proxy.
12. **Filter layers (L3/L4/L7/mesh)**: one straight line per direction passes under the layer boxes with `arrow-at-each-box=true` and without the layers' tags (`b4FO-51` ingress, `b4FO-52` egress). Each visible layer gets an arrow; with the layers hidden, the line keeps the flow connected. The API chain works the same way (`b4FO-50`: incoming-requests → authentication → … → accepted-requests).
13. **Traffic bands** (red = ingress, blue = egress) are drawn by the engine from `overlay` on the traffic lines, styled by the two legend lines (`overlay-definition`). They follow their lines' tags, so they hide with them. A line carrying both directions lists them in the order they lie across it.
14. **Child tags go on the parts, not on the container.** A box that holds parts of several children (a server, a container list, the RBAC box) keeps only the parent; its parts get the child. `onlyTags: ["Traditional.Edr"]` then still shows the servers (they only carry the parent) and just the EDR parts inside them. Parts inside a part inherit its child tags (rule 7).
15. **Level 0** (no `level-N`) is the minimum to explain a cluster: Cluster, masters/workers, API with incoming/accepted requests, Deployment/POD/Container/Process, Namespace with its resource list, Operator → kubectl → API.

Runtime semantics (diagram-webkit): an element is hidden if **any** of its topic tags is hidden, or if its highest `level-N` is above the selected level.

## Slug rules

- Only on cells with `help`. Required there.
- Unique. PascalCase, `[A-Za-z0-9]`, max 20 chars.
- Names the concept in the help title, not the position (`Sbom`, not `ImageBuilder2`).
- Renaming breaks old `pins=` links.

## Tag tree

- `Access` — people and tools that change the cluster
  - `Access.ServiceOwner` — service owner / developer
  - `Access.Operator` — platform operator(s)
  - `Access.Cli` — kubectl / oc / k9s / Headlamp
  - `Access.Portal` — service portal
- `Api` — kube-apiserver request path
  - `Api.Authn` — authentication, auth webhook, IdP, client CA, JWT
    - `Api.Authn.Webhook` — auth webhook
    - `Api.Authn.Identity` — where identities come from: IdP, client CA, JWT, auth-results
  - `Api.Authz` — authorization, `system:masters`
  - `Api.Rbac` — Role/ClusterRole, bindings, ServiceAccount, User/Group
    - `Api.Rbac.Role` — Role, ClusterRole
    - `Api.Rbac.Binding` — RoleBinding, ClusterRoleBinding
    - `Api.Rbac.Subject` — who is bound: User/Group, ServiceAccount
  - `Api.Admission` — validating/mutating admission
  - `Api.Apf` — API Priority and Fairness, rate limiting
  - `Api.Controllers` — the feedback loop: controllers watch objects and create new ones through the API, with their own identity
  - `Api.Objects` — Kubernetes objects: what you apply, and what controllers create from it
    - `Api.Objects.Deployment` — Deployment → ReplicaSet → Pods
    - `Api.Objects.CronJob` — CronJob → Job → Pods
    - `Api.Objects.Custom` — any object, e.g. a custom resource, becoming more objects, cluster-scoped ones too
- `ControlPlane` — control-plane components besides the API
  - `ControlPlane.Kubelet` — kubelet ↔ API, NodeRestriction
  - `ControlPlane.Scheduler`
  - `ControlPlane.ControllerManager`
  - `ControlPlane.Etcd` — etcd, API → etcd
- `Node` — node-level concerns
  - `Node.Roles` — masters / workers / infra / special nodes
  - `Node.Observability` — Hubble, network datapath
    - `Node.Observability.Datapath` — network datapath: cilium, traffic in and out
    - `Node.Observability.Hubble` — Hubble and its events
  - `Node.RuntimeSecurity` — runtime instrumentation, Falco, Tetragon
- `Namespace` — namespace as a boundary
  - `Namespace.Psa` — Pod Security Admission
  - `Namespace.Quota` — ResourceQuota, LimitRange
  - `Namespace.DefaultSa` — default ServiceAccount
  - `Namespace.Resources` — the namespaced resources listed in the namespace (Deployment, Service, Secret, …)
- `Workload` — pod contents
  - `Workload.ContainerType` — sidecar, init, ephemeral, WASM containers
    - `Workload.ContainerType.Sidecar`
    - `Workload.ContainerType.Init`
    - `Workload.ContainerType.Ephemeral`
    - `Workload.ContainerType.Wasm`
  - `Workload.Sandbox` — kata, gVisor, hardened runtimes
  - `Workload.Volume` — volume definitions, mounts, env/projections, ConfigMap/Secret
    - `Workload.Volume.Source` — ConfigMap/Secret as a volume source
    - `Workload.Volume.Type` — volume types and options: read-only, fs-group, selinux-mls, in memory, nfs, csi, host-paths
    - `Workload.Volume.Mount` — how it reaches the container: mounts, environment variables, projections
  - `Workload.Vm` — VirtualMachine, QEMU, virtual HW
- `ProcessSecurity` — isolation of the container process
  - `ProcessSecurity.Seccomp` — syscall filtering
  - `ProcessSecurity.Mac` — AppArmor, SELinux
  - `ProcessSecurity.Namespaces` — OS namespaces, user namespace
  - `ProcessSecurity.Cgroups`
  - `ProcessSecurity.RunPolicy` — non-root, read-only fs, capabilities, privileged, escalation
    - `ProcessSecurity.RunPolicy.User` — no root, force user, UID-map
    - `ProcessSecurity.RunPolicy.Privilege` — capabilities, privilege escalation, privileged
    - `ProcessSecurity.RunPolicy.Filesystem` — read-only root filesystem, proc
- `Network`
  - `Network.Ingress` — direction: traffic entering a pod (all routes). The route itself is under `Ingress`
  - `Network.Egress` — traffic leaving a pod: filters → other pods' Service/EndpointSlice, egress IPs → firewall → outside
    - `Network.Egress.Gateway` — CiliumEgressGatewayPolicy
    - `Network.Egress.RoutableIp` — routable egress IPs
    - `Network.Egress.Firewall` — firewall / VLAN on the way out
  - `Network.Service` — Service ClusterIP, EndpointSlice, exposed ports
    - `Network.Service.ClusterIp` — service (type=ClusterIP)
    - `Network.Service.EndpointSlice` — EndpointSlice (pod IPs)
    - `Network.Service.Port` — the pod's exposed port
  - `Network.PodToPod` — pod-to-pod traffic (default allow), egress into another pod
  - `Network.Policy` — NetworkPolicy/ClusterNetworkPolicy, L3/L4/L7 filter layers
    - `Network.Policy.L3` — L3 (IP) layer
    - `Network.Policy.L4` — L4 (TCP/UDP) layer
    - `Network.Policy.L7` — L7 (HTTP/DNS) layer
  - `Network.ServiceMesh` — L7 service-mesh layer, mTLS
  - `Network.Cni` — overlay/underlay interfaces, CNI and interface types
    - `Network.Cni.Overlay` — overlay CNIs: cilium, calico, flannel, OVN-Kubernetes, kube-OVN
    - `Network.Cni.Underlay` — underlay interface types: macvlan, ipvlan, host, SR-IOV, bridge
    - `Network.Cni.Multus` — Multus (multiple interfaces)
    - `Network.Cni.HostNetwork` — `hostNetwork`
  - `Network.ClusterMesh` — cluster-to-cluster
- `Ingress` — route of external traffic into the cluster, one child per API. Consumer carries the root
  - `Ingress.Controller` — classic Ingress: Ingress resource, IngressProxy, and its network path (LB, service type=NodePort)
  - `Ingress.GatewayApi` — Gateway API
    - `Ingress.GatewayApi.Gateway` — GatewayClass, Gateway, kgateway, TLS secret, GatewayProxy and its network path (routable-ip, service type=LoadBalancer)
    - `Ingress.GatewayApi.Route` — *Route, ReferenceGrant
    - `Ingress.GatewayApi.Policy` — policy attachment
- `CertManager`
  - `CertManager.Issuer` — Issuer, ClusterIssuer, external CA
  - `CertManager.Certificate` — Certificate → Secret
  - `CertManager.Controller` — the cert-manager controller and what it talks to
- `CronJob` — scheduled integrity / compliance checks
  - `CronJob.Integrity` — integrity checks
  - `CronJob.Compliance` — compliance checks
- `CustomOperator` — custom operators, orchestrators, Tofu
  - `CustomOperator.Namespaces` — namespace provisioning: System, Namespace, defaults
  - `CustomOperator.Infrastructure` — infrastructure as code: Tofu, infrastructure automation
- `SupplyChain`
  - `SupplyChain.Git` — git forge, protected branch, four-eyes
  - `SupplyChain.Gitops` — argocd, platform-management cluster
  - `SupplyChain.Signing` — signed commits, image signing, provenance
  - `SupplyChain.ImageBuild` — image builder, filtered internet
  - `SupplyChain.Scanning` — image scanning
  - `SupplyChain.Sbom`
  - `SupplyChain.Registry` — image repo, image pull
- `Logging`
  - `Logging.Pod` — stdout/stderr
  - `Logging.Api` — API/audit logs
  - `Logging.Service` — services/controllers
  - `Logging.Observability`
  - `Logging.Instrumentation`
- `Cnapp` — CNAPP scanner
- `Traditional` — non-cloud-native servers, for comparison
  - `Traditional.App` — the application: web, processes, data, resources
  - `Traditional.Hardening` — OS hardening on the servers: users, cgroups, SELinux, systemd
  - `Traditional.Edr` — EDR agents and the EDR
  - `Traditional.Admin` — administration: admin-server/Ansible, ssh
  - `Traditional.Network` — server networking and firewall
