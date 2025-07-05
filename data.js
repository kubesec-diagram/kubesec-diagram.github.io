const config = {
    markerScale: 0.01,
    tooltipMinWidth: 380,
    boundsCacheDuration: 16, // ~60fps
    imagePaths: {
        debug: './kubesec-diagram.png',
        production: 'https://media.githubusercontent.com/media/kubesec-diagram/kubesec-diagram.github.io/refs/heads/main/kubesec-diagram.png'
    },
    typeStyles: {
        'pri-1': { bg: '#c00', color: '#fff', radius: '50%', border: 'orange' },
        'pri-2': { bg: '#f60', color: '#fff', radius: '50%', border: 'orange' },
        'pri-3': { bg: '#ff0', color: '#000', radius: '50%', border: 'orange' },
        'info': { bg: '#0af', color: '#fff', radius: '6px', border: '#004080' }
    },
    ui: {
        loadingIndicatorId: 'loading-indicator',
        loadingMessage: 'Loading diagram...',
        errorAutoCloseDelay: 10000,
        tooltipHideDelay: 100
    }
};

const annotations = [
    { type: 'separator', title: 'Legend' },
    { type: 'pri-1', title: 'Pri-1', description: 'Focus on these first.' },
    { type: 'pri-2', title: 'Pri-2', description: 'Focus on these as well, but not that critical.' },
    { type: 'pri-3', title: 'Pri-3', description: 'Charrypick what you need, useful, but focus on others first' },
    { type: 'info', title: 'Additional info', description: 'Explainations for better understanding of a concept' },

    { type: 'separator', title: 'Security posibilities' },
    {
        x: 0.124, y: 0.040, type: "pri-2", title: "Signed Git Commits", description: `
          Git commits should be signed using a hardware security key (e.g., YubiKey)
          to ensure authenticity. ArgoCD can be configured to verify commit signatures
          before deployment.
    `},
    {
        x: 0.121, y: 0.220, type: "pri-2", title: "Service Portal", description: `
          Non-admin users should request cluster resources through a service portal
          instead of direct kubectl access. This portal can generate GitOps-compatible
          manifests and apply policy-based validation before committing to Git.

          It must be separate from administrative tools and enforce access control
          and input validation.
    `},
    {
        x: 0.911, y: 0.779, type: "pri-2", title: "Namespaced vs Cluster-wide Resources", description: `
          Understand the distinction between namespaced and cluster-wide resources
          to apply security policies effectively. Namespaced resources can be isolated
          per team, while cluster-wide resources require stricter access control and
          governance to prevent privilege escalation.
    `},
    {
        x: 0.792, y: 0.040, type: "pri-2", title: "Kubernetes Distributions and OS Choices", description: `
          Choose a Kubernetes distribution and OS designed for security and minimal
          attack surface. Avoid general-purpose OSes that require separate patching.

          Consider immutable, minimal, and hardened distros (e.g., Talos, Flatcar,
          Bottlerocket) purpose-built for Kubernetes production environments.
    `},
    {
        x: 0.565, y: 0.072, type: "pri-2", title: "Operators and Infrastructure Workloads", description: `
          Operators act on custom Kubernetes resources (e.g., Certificates) via standard
          controllers. They typically run as Deployments and require RBAC access to specific APIs.

          Treat operators like any other workload: apply strict access controls,
          run them on dedicated nodes if needed, and isolate privileges based on
          least privilege principles.
    `},
    {
        x: 0.681, y: 0.253, type: "pri-1", title: "Namespaces", description: `
          Namespaces are logical boundaries used to apply security controls such as
          network policies, RBAC, and runtime restrictions.

          While not a security mechanism by themselves, they enable isolation between
          workloads and enforce separation of concerns.

          Do not confuse Kubernetes namespaces with Linux process namespaces inside containers.
    `},
    {
        x: 0.608, y: 0.757, type: "pri-1", title: "The Container Process", description: `
          The containerized application process is governed by multiple security layers:
          PodSecurity policies, namespace policies, and runtime enforcement tools.
          Tools like Falco uses eBPF to monitor container behavior without
          the container being aware of it. Use tools like KubeArmor to enforce behavior.

          There are many enterprise solutions as well; Sysdig Secure, Tetragon and PrismaCloud
          is all worth evaluating.
          Some, like NeuVector are also opensource.

          Syscalls are often restricted by default. Container escapes and 0-days typically
          require misconfigurations such as excessive Linux capabilities, unfiltered syscalls,
          insecure mounts, or relaxed namespace settings.

          Linux namespaces isolate PIDs, network interfaces, and other kernel features.
          cgroups enforce CPU/memory limits and can freeze containers for forensic inspection.

          Runtime policies can enforce behaviors like 'runAsNonRoot' or fixed UID/GID.
          These policies are defined at the container or pod level, and some are also
          baked into the image via the Dockerfile or Containerfile.
    `},
    {
        x: 0.607, y: 0.340, type: "pri-1", title: "Ingress", description: `
          Kubernetes Ingress resources configure an ingress controller (e.g., NGINX, HAProxy)
          to handle inbound traffic. Controllers support annotations for TLS settings,
          authentication, WAF (e.g., ModSecurity), and other security features.

          Routing is typically based on SNI (FQDN) and HTTP-layer data such as path,
          method, or headers. Secure configuration of the ingress controller is critical,
          including rate limiting, header validation, and TLS hardening.
    `},
    {
        x: 0.564, y: 0.364, type: "pri-1", title: "Default Pod-to-Pod Traffic", description: `
          By default, all pods can communicate with each other. Use a default-deny
          NetworkPolicy to block all traffic, then explicitly allow only necessary
          communication between pods.

          This is essential for achieving network segmentation and reducing the
          blast radius of a compromise.
    `},
    {
        x: 0.525, y: 0.369, type: "pri-1", title: "Network Control", description: `
          Network policies can enforce L3/L4 restrictions using eBPF or iptables,
          while L7 policies are enforced via proxies (e.g., Envoy).

          Some CNIs support admin-level policies that cannot be overridden by
          namespace users, enabling enforcement of cluster-wide or organizational
          security standards.
    `},
    {
        x: 0.241, y: 0.685, type: "pri-1", title: "Image Repository", description: `
          Container images should be scanned for vulnerabilities before being stored in
          or pulled from the image repository.

          Use tools that enforce image admission policies, signature verification,
          and vulnerability thresholds to block untrusted or outdated images.
    `},
    {
        x: 0.386, y: 0.063, type: "pri-1", title: "Kubernetes API", description: `
          The Kubernetes API is the primary control plane entry point and must be tightly secured.
          All access passes through two main stages: authentication and authorization.

          Authentication verifies the identity of the requestor via client certificates,
          bearer tokens, OpenID Connect (OIDC), or webhook tokens. By default,
          anonymous requests are permitted and should be explicitly disabled in production clusters.

          Authorization determines whether the authenticated user is allowed to perform an action.
          Kubernetes supports RBAC (Role-Based Access Control) and ABAC (Attribute-Based Access Control),
          with RBAC being the most common. RBAC uses roles and bindings to grant fine-grained access
          to specific verbs (e.g., GET, CREATE), resource types, and API groups. ABAC uses JSON policies
          and can provide more flexible but harder-to-audit logic.

          Enable audit logging on the API server to log all authenticated requests and send them
          to a remote log backend for monitoring and incident response.
    `},
    {
        x: 0.375, y: 0.232, type: "pri-2", title: "Validating and Mutating Admission Control", description: `
          Admission controllers intercept API requests after authentication and authorization,
          allowing for policy enforcement. Tools like Kyverno and OPA Gatekeeper can validate
          incoming YAML against cluster policies or mutate it to enforce configuration standards
          (e.g., securityContext, labels, resource limits).

          All resources—user-submitted or system-generated—must pass admission control.
          These controllers can also enforce image signature verification (e.g., cosign)
          and SLSA provenance checks to prevent untrusted artifacts from being deployed.
    `},
    {
        x: 0.342, y: 0.249, type: "pri-2", title: "API to etcd Communication", description: `
          The Kubernetes API server communicates with etcd to persist cluster state.
          Read operations (e.g., GET) fetch data directly and do not trigger admission controllers.

          Admission controllers only intercept mutating operations (e.g., CREATE, UPDATE, DELETE).
          This means read access must be tightly controlled via RBAC/ABAC, since policies cannot
          be enforced via admission webhooks for those requests.
    `},
    {
        x: 0.372, y: 0.335, type: "pri-2", title: "Secrets and ConfigMaps", description: `
          Secrets and ConfigMaps can be encrypted at rest using encryption providers
          configured on the API server. The decryption keys are typically stored inside
          the cluster, often on disk.

          For improved security, use external KMS providers (e.g., HashiCorp Vault, AWS KMS)
          to manage keys and prevent key compromise within the cluster.
    `},
    {
        x: 0.315, y: 0.277, type: "pri-2", title: "Secure CNI (e.g., Cilium)", description: `
          Use a CNI plugin that supports fine-grained network policies and visibility,
          such as Cilium with eBPF. Define a baseline deny-all policy and explicitly allow
          only required traffic.

          Default Kubernetes network policies are namespace-scoped and may not cover all scenarios.
    `},
    {
        x: 0.577, y: 0.444, type: 'pri-2', title: 'Traffic before filters', description: `
          Traffic before reaching L7 filters (e.g., Envoy) is often encrypted with mTLS.
          This makes payload inspection impossible, but metadata such as SNI, client identity,
          or source IP can still be used to enforce context-aware ACLs.

          Use this metadata to apply fine-grained policies even when the content is opaque.
    `},
    {
        x: 0.390, y: 0.738, type: 'pri-2', title: 'Container image', description: `
          Container runtimes can be configured to only allow signed images using tools like cosign.
          Admission controllers such as Kyverno can enforce signature verification and additional
          build metadata (e.g., SLSA provenance).

          Images should also be scanned for vulnerabilities before deployment and flagged or blocked
          based on severity thresholds.
    `},
    {
        x: 0.505, y: 0.721, type: 'pri-2', title: 'Mounted volumes and env-vars', description: `
          External data is often injected into pods via environment variables or projected volumes.
          These are typically read-only and can include ConfigMaps, Secrets, or dynamic runtime
          values like the pod IP or namespace.

          When a pod needs to interact with the Kubernetes API, a service account token is
          automatically mounted as a projected volume. Ensure proper RBAC scoping for the
          associated service account to avoid privilege escalation.
    `},
    {
        x: 0.440, y: 0.667, type: 'pri-2', title: 'Network interfaces (underlay)', description: `
          Pods can use different types of network interfaces depending on requirements.
          Containers can bind directly to the host interface, or use other means to communicate
          over vlans and such.

          Be aware: underlay networks (e.g., macvlan) typically bypass Kubernetes NetworkPolicies.
          Overlay networks used by most CNIs enforce policy as expected and are safer by default.
    `},
    {
        x: 0.532, y: 0.667, type: 'pri-2', title: 'Network interfaces (overlay)', description: `
          Normal kubernetes network is done using an overlay using a CNI (Container Network Interface),
          like Cilium, Flannel, Calico and many others. They have various functionality and security.
          Example, some CNIs doesnt support egress network policies, some uses eBPF a lot, some iptables.
    `},
    {
        x: 0.748, y: 0.922, type: 'pri-2', title: 'Internal pod egress', description: `
          Egress traffic from a pod to other services inside the cluster can be controlled
          using NetworkPolicies, similar to ingress rules. However, egress rules are often
          overlooked, as ingress is more commonly enforced.

          Define explicit egress policies to restrict which services a pod can communicate
          with, reducing lateral movement and attack surface in case of compromise.
    `},
    {
        x: 0.335, y: 0.882, type: 'pri-3', title: 'Egress', description: `
          Egress policies control outbound traffic from pods using label selectors and
          destination IPs or CIDRs. These rules help prevent unauthorized external access.

          Some CNIs support assigning dedicated egress IPs per namespace or pod,
          enabling traceability and firewall integration for outbound traffic control.
    `},
    {
        x: 0.589, y: 0.659, type: 'pri-3', title: 'Exposed port', description: `
          All containers in a pod share the same network namespace and run on the same node.
          This allows enforcement of eBPF-based filters and transparent mTLS at the network level.

          With sidecars or service mesh integration, unencrypted ports like 80 can safely be
          exposed internally. Encryption, authentication, and access control are handled outside
          the application, making this a secure and preferred approach for internal services.
    `},
    {
        x: 0.554, y: 0.649, type: 'pri-3', title: 'Traffic after filters', description: `
          This is the raw, decrypted traffic that reaches the application after passing
          through L7 filters or service mesh proxies. At this point, the traffic is no
          longer encrypted and can be inspected or modified by sidecars or host-level tools
          before delivery to the application process.

          Ensure that applications enforce their own validation and security controls,
          as traffic is now trusted and inside the protected boundary.
    `},
    {
        x: 0.449, y: 0.460, type: 'pri-3', title: 'VirtualMachine or other workload-types', description: `
          Other workload types, such as VirtualMachines (e.g., via KubeVirt), follow the same
          security mechanisms as pods: RBAC, network policies, storage classes, and admission control.

          They are not inherently more privileged and should be treated like any other workload
          with proper isolation, policy enforcement, and monitoring in place.
    `},
    {
        x: 0.289, y: 0.487, type: 'pri-3', title: 'Other cluster nodes', description: `
          Inter-node traffic may use direct IP-to-IP communication or be encapsulated,
          depending on the CNI configuration. Encryption can be applied at this level via
          service mesh (e.g., mTLS) or CNI-level encryption.

          Certain workloads—such as ingress controllers, operators, or AI/ML jobs—should
          be scheduled on dedicated nodes using taints, tolerations, or node selectors to
          enforce separation and reduce security risk.
    `},
    {
        x: 0.351, y: 0.282, type: 'pri-3', title: 'etcd', description: `
          etcd stores the entire state of the Kubernetes cluster and must be protected accordingly.
          Enable encryption at rest using the API server's encryption provider configuration.

          Access to etcd should be strictly limited to the API server. Ensure mutual TLS is enabled,
          and never expose etcd directly to the network.
    `},
    {
        x: 0.265, y: 0.251, type: 'pri-3', title: 'Cluster to cluster mesh (cluster-mesh)', description: `
          A cluster-mesh connects multiple Kubernetes clusters to enable cross-cluster
          communication with cloud-native networking features. This allows services in
          different clusters to communicate as if they were in the same network.

          Traffic can be encrypted using mTLS and authenticated using workload identities
          unique to each cluster. With proper setup, standard Kubernetes NetworkPolicies
          can be enforced across cluster boundaries.
    `},
    {
        x: 0.274, y: 0.431, type: 'pri-3', title: 'Custom Operators / orchestrators', description: `
          Properly designed custom operators can enhance security by integrating tightly
          with Kubernetes-native patterns like RBAC, admission control, and CRDs.

          For example, you can expose a custom resource that developers use to request
          infrastructure, while the operator enforces policy-compliant templates and behavior.
          Operators can also manage resources external to the cluster in a controlled and auditable way.
    `},
    {
        x: 0.462, y: 0.102, type: 'pri-3', title: 'Internal API communication', description: `
          The Kubernetes API should only be accessible to internal system components,
          operators, and pods that explicitly require it.

          Use default-deny NetworkPolicies to block access by default, and only allow
          specific namespaces or service accounts to communicate with the API server.
          This minimizes the attack surface and enforces least privilege access.
    `},
    {
        x: 0.469, y: 0.048, type: 'pri-3', title: 'Authentication webhook', description: `
          Authentication webhooks are less commonly used, but can provide additional
          control beyond standard RBAC. They allow dynamic authentication decisions
          based on external systems or custom logic.

          For example, a webhook can reject requests targeting namespaces that match
          certain patterns or enforce organization-specific access rules in real time.
    `},
    {
        x: 0.129, y: 0.415, type: 'pri-3', title: 'Service owner deployment', description: `
          For improved security, use a dedicated GitOps stack (e.g., ArgoCD or Flux)
          for service owners deploying applications. This instance should have restricted
          access and only be permitted to modify specific resources within designated namespaces.

          This separation ensures that service owners operate within defined boundaries,
          reducing the risk of misconfiguration or privilege escalation.
    `},
    {
        x: 0.429, y: 0.185, type: 'pri-2', title: 'system:masters group', description: `
          The 'system:masters' group is a built-in Kubernetes group that bypasses the
          authorization layer and grants full administrative access to the cluster.

          It should only be used for initial bootstrapping or controlled RBAC testing.
          Ensure no regular users or service accounts are members of this group.
          Monitor and audit usage carefully—this group should be empty in production environments.
    `},
    {
        x: 0.667, y: 0.887, type: 'pri-3', title: 'Hardened container runtimes', description: `
          Hardened container runtimes provide additional isolation layers beyond standard
          runtimes like runc. For example, gVisor intercepts syscalls and provides a
          userspace kernel implementation, while Kata Containers wrap each container in
          lightweight virtual machines.

          OpenShift Sandbox Containers use Kata under the hood to offer enhanced isolation.
    `},
    {
        x: 0.667, y: 0.717, type: 'pri-3', title: 'Sidecar container', description: `
          Sidecar containers can improve security by isolating responsibilities such as TLS termination,
          authentication, or logging from the main app. They are used by some service meshes (e.g., Istio),
          but newer approaches like eBPF and ambient meshes offer lower overhead and better scalability.

          Sidecars share the same network namespace, allowing secure localhost (127.0.0.1) communication.
          They can also enforce policies or proxy traffic, but increase attack surface and resource usage.
    `},
    {
        x: 0.667, y: 0.754, type: 'pri-3', title: 'Init container', description: `
          Init containers enhance security by performing setup tasks before the main container starts,
          such as validating configs, downloading secrets, or verifying service dependencies.

          They run with separate images and permissions, reducing attack surface in the main container.
          Types include wait-for-dependency containers, secret fetchers, permission fixers (e.g., chown volumes),
          and environment validators. Since they run sequentially and exit before app start,
          they can enforce strict preconditions and avoid persistent exposure.
    `},
    {
        x: 0.667, y: 0.788, type: 'pri-3', title: 'Ephemeral containers', description: `
          Ephemeral containers are used for live debugging of running Pods without restarting them.
          They provide no guarantees on lifecycle, don't support volumes, and can't be part of normal app logic.
          From a security standpoint, they are powerful but risky—if enabled, they allow runtime inspection,
          so access should be tightly controlled (e.g., via RBAC).

          They share namespaces (like network and PID) with existing containers,
          enabling deep introspection but also potential abuse if misused.
    `},
    {
        x: 0.667, y: 0.824, type: 'pri-3', title: 'WASM containers', description: `
          WASM containers aim to run WebAssembly modules in place of traditional OCI containers,
          offering stronger isolation, faster cold starts, and lower resource usage. They don't rely on Linux syscalls,
          reducing attack surface and making them ideal for sandboxed, untrusted code. Projects like wasmEdge,
          containerd-shim-wasmedge, and Krustlet explore this in Kubernetes.

          Long-term, WASM containers could enable safer multi-tenant workloads and portable compute
          across cloud, edge, and browser environments.
    `},
    { type: 'separator', title: 'Info' },
    {
        x: 0.029, y: 0.044, type: 'info', title: 'What is this and how to use..', description: `
          This is a diagram made to better understand and get an overview of kubernetes security.

          It's not complete (but you are welcome to submitt a PR/issue), nor is it perfect, it is biased and it might not be for you.

          It might however help you to discuss kubernetes in a security-context with your team, or just to get a better understanding yourself.

          The drawing is most likely an overkill. It is not ment as a "solution" or design.
          It's also quite busy, with a ton of elements. It's not ment to "explain" everything, but something you can sit down with and browse around and maybe learn something new.

          Also, it is on-prem... For non on-prem, it might not be that relevant.
    `},
    {
        x: 0.470, y: 0.678, type: 'info', title: 'Multi-interface (Multus)', description: `
          A pod can have multiple network interfaces using the Multus CNI plugin.
          This allows attaching additional networks to a pod beyond the default CNI.

          It is useful for scenarios like separating control and data planes,
          connecting to legacy networks, or assigning dedicated interfaces for specific protocols.
    `},
    {
        x: 0.364, y: 0.423, type: 'info', title: 'A Deployment', description: `
          This represents the internal structure of a single Deployment. The same applies
          to other controller types like DaemonSets and StatefulSets.

          For simplicity, Deployments are visualized as single objects throughout this diagram.
    `},
    {
        x: 0.231, y: 0.332, type: 'info', title: 'What is an "operator"', description: `
          Operators in Kubernetes extend the control plane by automating the management
          of complex applications or infrastructure using custom resources and controllers.

          For example, a system operator can create defaults like Namespaces, or manage
          external resources through custom objects like a "Tofu" resource controlling
          infrastructure outside the cluster.

          Kubernetes can serve as a generic orchestration engine—beyond just container workloads.
    `},
    {
        x: 0.900, y: 0.817, type: 'info', size: 'small', title: 'Configurable capability', description: `
          Represents a capability in the platform or workload that can be configured
          or overridden as needed.

          These are typically adjustable via policies, annotations, or runtime settings.
    `},
    {
        x: 0.900, y: 0.769, type: 'info', size: 'small', title: 'Kubernetes resource', description: `
          Kubernetes is built around resource types such as Pod, Service, Deployment,
          Ingress, and Node.

          Some resource types shown in this diagram are fictional or optional,
          included for illustrative purposes to show architectural completeness.

          Example of a simple Pod resource
          <hr />
          apiVersion: v1
          kind: Pod
          metadata:
            name: my-app
            namespace: default
            labels:
              app: demo
              tier: frontend
          spec:
            containers:
              - name: my-app
                image: nginx:1.25
                ports:
                  - containerPort: 80
 `         },
];