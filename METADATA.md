# Diagram metadata

Metadata on cells in `kubesec-diagram.drawio.svg`. Edit in draw.io: Edit Data (`Ctrl+M`) on the cell. `kubesec-diagram.svg` is rendered from it (`npm run render`; CI does it on push): never edit that one.

| Attribute | Used for |
|---|---|
| `tags` | filtering, levels, priority styling |
| `slug` | pins (`pins=`), unique id of a help entry |
| `help` | tooltip / panel text |
| `help.<formatter>.<name>` | an example shown as a tab next to `help` (`help.yaml.falco_rule`); value = the code. Formatters: `text`, `shell`, `yaml`, `json`, `log`, `containerfile`. The tab title is `<name>` in lowercase, `_` = space |
| `overlay-definition` | on a legend line: its look is the overlay band of that name (`ingress`, `egress`) |
| `overlay-tags` | on an `overlay-definition` line: tags every band of that overlay carries (`_ _.Traffic _.Traffic.Ingress`) |
| `overlay` | on a line: the bands drawn along it, side by side in this order: the first on the left, looking along the arrow (`egress`, `ingress,egress`) |
| `overlay-destination` | on a box: `true` = bands end or start there, none passes through (a process several flows point at) |
| `arrow-at-each-box` | on a line: `true` repeats its arrowhead at every box drawn over it (priority circles and `?` markers excluded). On a box: `true` always, `false` never an arrow there |

## Casing

Only meta tags are lowercase. Everything else is PascalCase without `-`. Acronyms are written as words (`Api`, `Sbom`, `Vm`).

| Kind | Form | Values |
|---|---|---|
| meta tag | lowercase, `-` before a suffix | `level-1..3`, `pri-1..3`, `info`, `legend`, `css-<name>` |
| topic tag | PascalCase segments joined by `.` | the tree below |
| internal topic | `_` + PascalCase segments | `_.Frame.Pod`, `_.Group.Actors` |
| slug | PascalCase | unique per help entry |

## Topic rules

1. **A topic is a concept that can be explained or hidden on its own.** Depth is handled by `level-N`, never by a tag.
2. **Hierarchy by name.** Each `.`-separated segment is one level. The parent is the name without its last segment: `Network` → `Network.Egress` → `Network.Egress.Gateway`. A segment is PascalCase and may be several words (`Ingress.GatewayApi`). Max depth is 3.
3. **Ancestors are mandatory.** An element with `Network.Egress.Gateway` also has `Network.Egress` and `Network`. Hiding a parent then hides the whole branch. The runtime does not derive ancestors yet.
4. **Leaf preferred.** A parent alone is allowed only on hub elements that belong to the whole family (e.g. `API (kube-apiserver)` → `Api`).
5. **Multiple concepts allowed.** An element may carry several leaves (e.g. image-scanner/signer box → `SupplyChain.Scanning SupplyChain.Signing`).
6. **Core elements have no topic.** Cluster, nodes, Deployment/POD/Container/Process boxes get only `level-N` (and internal topics, rule 16).
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

16. **Internal topics (`_`)** are for building views (slides): frames and groupings that would be noise as regular topics. Shown only in tag picker mode, never as badges; `onlyTags` and "hide others" leave them alone, so adding one never changes a view. Hide them with `hiddenTags` / `filter-hide-tags`.
    - `_.Frame.<Name>` goes on the frame box only: not on its contents (no rule 7), its lines or its markers. Hiding it removes the frame and its label.
    - `_.Group.<Name>` goes on the members and on the lines attached to them, not on markers.
    - `_.Item.<Name>`: one per box and frame (not markers or legend), also on the lines attached to it, so hiding it takes its lines too; a frame's contents stay. Frames use their `_.Frame` name. Name: the slug, else the label in PascalCase (max 4 words); duplicates are prefixed with their frame (`ServerAppSsh`), then numbered.
    - `_.Link.<From>To<To>`: one per line (`Junction` for an end on another line), to hide a single line.
    - `_.Area.<Frame>`: a frame, everything inside it (markers too) and the lines with an end in it: a whole region.
    - `_.Kind.<Name>`: boxes by their legend colour. `_.Line.<Name>`: lines by their legend style.
    - `_.Traffic`: lines with `overlay`; `_.Traffic.Ingress` / `_.Traffic.Egress` only on lines that carry only that one. The legend lines' `overlay-tags` give every band of an overlay the same tag, so hiding `_.Traffic.Ingress` removes all red bands and the ingress-only lines, while two-way lines keep their blue band.
    - Ancestors are mandatory (`_ _.Frame _.Frame.Pod`).

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
- `_` — internal topics (rule 16), shown only in tag picker mode
  - `_.Frame` — frame boxes, without their contents
    - `_.Frame.Api` — API (kube-apiserver)
    - `_.Frame.CertManager` — Operator (cert-manager)
    - `_.Frame.Cgroups` — cgroups
    - `_.Frame.Cluster` — Cluster
    - `_.Frame.Container` — Container (OCI)
    - `_.Frame.Controllers` — Controllers
    - `_.Frame.CronJob` — CronJob (schedules)
    - `_.Frame.CustomOperator` — Operator (custom)
    - `_.Frame.Deployment` — Deployment / DaemonSet / StatefulSet
    - `_.Frame.KernelActivity` — Kernel activity
    - `_.Frame.KernelSecurity` — Kernel security
    - `_.Frame.KubernetesObjects` — Kubernetes objects
    - `_.Frame.Namespace` — Namespace
    - `_.Frame.NetworkOverlay` — Network interfaces (overlay)
    - `_.Frame.NetworkUnderlay` — Network interfaces (underlay)
    - `_.Frame.NodeContext` — Node Context
    - `_.Frame.OsNamespaces` — OS-namespaces
    - `_.Frame.PlatformManagement` — platform-management cluster
    - `_.Frame.Pod` — Pod
    - `_.Frame.Process` — Process (host kernel process)
    - `_.Frame.Rbac` — RBAC
    - `_.Frame.RunPolicies` — Run policies
    - `_.Frame.RuntimeInstrumentation` — Runtime Instrumentation
    - `_.Frame.Seccomp` — seccomp
    - `_.Frame.ServerApp` — server-app
    - `_.Frame.ServerDb` — server-db
    - `_.Frame.Traditional` — non-cloudnative / traditional
    - `_.Frame.VirtualMachine` — VirtualMachine
    - `_.Frame.VmGuest` — virtual machine (inside QEMU)
    - `_.Frame.VmPod` — Pod of the VirtualMachine
    - `_.Frame.VmProcess` — Process (QEMU)
    - `_.Frame.VolumeDefinitions` — Volume definitions
  - `_.Group` — groupings across topics
    - `_.Group.Actors` — people (service owner, operators, consumer, server user) and their lines
    - `_.Group.External` — everything outside the Cluster frame and not inside a cluster frame (actors, platform-management, traditional servers, logging, registries, internet, ...) and the lines attached to it
  - `_.Item` — single elements and frames, with the lines attached to them, one tag each (`_.Item.Logging`, `_.Item.Kubelet`, `_.Item.Container`)
  - `_.Link` — single lines, one tag each (`_.Link.NetworkUnderlayToContainer`)
  - `_.Area` — whole regions: a frame, its contents and the lines with an end in it (`_.Area.NodeContext`, `_.Area.Pod`), one per `_.Frame`
  - `_.Kind` — boxes by legend colour
    - `_.Kind.ClusterResource` — k8s resources (cluster-scope)
    - `_.Kind.NamespacedResource` — k8s resource (namespaced)
    - `_.Kind.Capability` — configurable capability
    - `_.Kind.BlockedCapability` — default blocked capability
    - `_.Kind.Server` — server
    - `_.Kind.Traditional` — traditional (non cloud-native)
    - `_.Kind.Cluster` — cluster (kubernetes)
  - `_.Line` — lines by legend style
    - `_.Line.Flow` — communication / flow (solid)
    - `_.Line.Creates` — creates (dashed)
    - `_.Line.BelongsTo` — acts on / belongs to (double dashed)
  - `_.Traffic` — traffic: lines with `overlay`, and the bands themselves (`overlay-tags` on the legend lines)
    - `_.Traffic.Ingress` — ingress bands, and lines that carry only ingress
    - `_.Traffic.Egress` — egress bands, and lines that carry only egress
- `Traditional` — non-cloud-native servers, for comparison
  - `Traditional.App` — the application: web, processes, data, resources
  - `Traditional.Hardening` — OS hardening on the servers: users, cgroups, SELinux, systemd
  - `Traditional.Edr` — EDR agents and the EDR
  - `Traditional.Admin` — administration: admin-server/Ansible, ssh
  - `Traditional.Network` — server networking and firewall
